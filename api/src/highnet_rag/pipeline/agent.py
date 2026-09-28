"""Agentic retrieval: a manual Claude tool-use loop. The model plans, calls `search` once per
fact it needs, and calls `answer` when the passages cover the question. Every turn and every
tool call is a trace event; each search runs the full retrieval pass nested under its step.

The loop is capped by AGENT_MAX_STEPS searches and AGENT_TOKEN_CAP tokens across the agent's
turns, and each turn passes the same worst-case budget guard as the answer. The caps are in the
trace, and so is every reason the loop stopped.
"""

import string
from collections.abc import AsyncIterator
from typing import Any

from highnet_rag.budget import BudgetState, budget_state
from highnet_rag.pipeline.deps import Deps, QueryParams
from highnet_rag.pipeline.search import Event, Retrieval, Spend, retrieve
from highnet_rag.pricing import cost_usd
from highnet_rag.providers.base import AgentTurn
from highnet_rag.storage.base import ChunkSet
from highnet_rag.trace import StageClock, Tracer

# snippet: agent_plan | The agent's instructions and tools
AGENT_SYSTEM = """You gather evidence to answer a question from a small corpus of English \
Wikipedia articles (the SQuAD 2.0 dev set). You cannot answer from memory. Break the question \
into the separate facts it depends on and call `search` once per fact, with a short, \
keyword-rich query (names, dates, places). Read the results; search again only if a fact is \
still missing. When the passages found cover every part of the question, call `answer`. \
Before your first search, state your plan in one or two sentences."""

TOOLS: list[dict[str, Any]] = [
    {
        "name": "search",
        "description": "Search the corpus. Returns the best-matching passages, numbered.",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string", "description": "A short search query."}},
            "required": ["query"],
        },
    },
    {
        "name": "answer",
        "description": "Stop searching: the passages found are enough to answer the question.",
        "input_schema": {"type": "object", "properties": {}},
    },
]
# /snippet

MAX_QUERY_CHARS = 200
TOP_LABEL = "3"  # agent steps are numbered 3a, 3b, ... after the request (1) and plan (2)


def step_label(n: int) -> str:
    return TOP_LABEL + string.ascii_lowercase[n % 26]


def turn_cost(turn: AgentTurn, model: str, deps: Deps) -> tuple[int, float]:
    tokens = turn.input_tokens + turn.output_tokens
    return tokens, cost_usd(model, deps.settings, turn.input_tokens, turn.output_tokens)


async def run_agent(
    params: QueryParams,
    deps: Deps,
    tracer: Tracer,
    chunk_set: ChunkSet,
    budget: BudgetState,
    spend: Spend,
    out: Retrieval,
) -> AsyncIterator[Event]:
    settings, providers = deps.settings, deps.providers
    model = providers.answer
    caps = {"max_steps": settings.agent_max_steps, "token_cap": settings.agent_token_cap}

    # Past the budget's 80% mark the agent is paused; the classic pipeline answers instead.
    if budget.tier != "normal":
        yield tracer.skipped(
            "agent_plan",
            "Agentic mode is paused: this month's budget is past its 80% mark. "
            "The classic pipeline answered instead.",
        )
        async for event in retrieve(params.q, params, deps, tracer, chunk_set, budget, spend, out):
            yield event
        return

    tracer.labels = {
        "request": "1",
        "agent_plan": "2",
        "select_context": "4",
        "prompt": "5",
        "generate": "6",
        "citations": "7",
    }
    messages: list[dict[str, Any]] = [{"role": "user", "content": f"Question: {params.q}"}]
    found: dict[int, tuple[int, int]] = {}  # chunk id -> (rank in its search, step number)
    searches = 0
    used_tokens = 0
    stopped: str | None = None

    # snippet: agent_plan,agent_step | The agent loop
    for turn_no in range(settings.agent_max_steps + 2):
        clock = StageClock()
        stage = "agent_plan" if turn_no == 0 else "agent_step"
        where = {} if turn_no == 0 else {"label": step_label(searches)}
        # Guards before every model call: the token cap for the loop, and the budget.
        try:
            input_tokens = await model.count_tokens(AGENT_SYSTEM, messages, TOOLS)
        except Exception as exc:
            yield tracer.error(stage, clock, exc, **where)
            out.failed = True
            return
        worst = input_tokens + settings.agent_turn_max_tokens
        remaining_budget = budget_state(deps.state, settings).remaining_usd
        if used_tokens + worst > settings.agent_token_cap:
            stopped = f"The next turn could pass the {settings.agent_token_cap:,}-token cap."
        elif cost_usd(model.model, settings, input_tokens, settings.agent_turn_max_tokens) > (
            remaining_budget
        ):
            stopped = "The next turn could cost more than is left in this month's budget."
        if stopped:
            break
        try:
            turn = await model.agent_turn(
                AGENT_SYSTEM, messages, TOOLS, settings.agent_turn_max_tokens
            )
        except Exception as exc:
            yield tracer.error(stage, clock, exc, **where)
            out.failed = True
            return
        tokens, cost = turn_cost(turn, model.model, deps)
        used_tokens += tokens
        spend(stage, model.provider, model.model, turn.input_tokens, turn.output_tokens, cost)
        if turn_no == 0:
            yield tracer.event(
                "agent_plan",
                clock,
                {
                    "provider": model.provider,
                    "model": model.model,
                    "plan": turn.text,
                    "queries": [c.input.get("query") for c in turn.calls if c.name == "search"],
                    "caps": caps,
                    "system": AGENT_SYSTEM,
                },
                tokens=tokens,
                cost_usd=cost,
            )
            turn_charged = True
        else:
            turn_charged = False

        results: list[dict[str, Any]] = []
        finished = turn.stop_reason != "tool_use" or not turn.calls
        for call in turn.calls:
            # A later turn's cost rides on its first step, so every token shows up once.
            charge = {} if turn_charged else {"tokens": tokens, "cost_usd": cost}
            turn_charged = True
            if call.name == "answer":
                yield tracer.event(
                    "agent_step",
                    StageClock(),
                    {"tool": "answer", "input": {}, "note": turn.text, "found": len(found)},
                    label=step_label(searches),
                    **charge,
                )
                results.append({"type": "tool_result", "tool_use_id": call.id, "content": "OK"})
                finished = True
                continue
            query = str(call.input.get("query", "")).strip()[:MAX_QUERY_CHARS]
            if call.name != "search" or not query:
                message = (
                    f"Unknown tool {call.name!r}." if call.name != "search" else "Empty query."
                )
                yield tracer.event(
                    "agent_step",
                    StageClock(),
                    {"tool": call.name, "input": call.input, "error": {"message": message}},
                    status="warning",
                    label=step_label(searches),
                    **charge,
                )
                results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": call.id,
                        "content": message,
                        "is_error": True,
                    }
                )
                continue
            if searches >= settings.agent_max_steps:
                stopped = f"Reached the limit of {settings.agent_max_steps} searches."
                finished = True
                break
            label = step_label(searches)
            searches += 1
            yield tracer.event(
                "agent_step",
                StageClock(),
                # The turn's text belongs to its first step only (the plan holds turn one's).
                {"tool": "search", "input": {"query": query}, "note": turn.text if charge else ""},
                label=label,
                **charge,
            )
            search = Retrieval()
            async for event in retrieve(
                query,
                params,
                deps,
                tracer,
                chunk_set,
                budget,
                spend,
                search,
                parent=label,
                with_map=False,
            ):
                yield event
            if search.failed:
                content = "The search failed; see the trace."
                results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": call.id,
                        "content": content,
                        "is_error": True,
                    }
                )
                continue
            passages = deps.corpus.chunks([cid for cid, _ in search.selected])
            for rank, chunk in enumerate(passages, start=1):
                found.setdefault(chunk.id, (rank, searches))
            listing = "\n\n".join(
                f"[{chunk.id}] {chunk.doc_title}: {chunk.text}" for chunk in passages
            )
            results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": call.id,
                    "content": listing or "No passages.",
                }
            )
        if not turn_charged:
            # A turn that called no tools still cost tokens: it gets its own step.
            yield tracer.event(
                "agent_step",
                StageClock(),
                {"tool": "none", "input": {}, "note": turn.text, "found": len(found)},
                label=step_label(searches),
                tokens=tokens,
                cost_usd=cost,
            )
        if finished or stopped:
            break
        messages += [
            {"role": "assistant", "content": turn.content},
            {"role": "user", "content": results},
        ]
    else:
        stopped = f"Reached the limit of {settings.agent_max_steps + 2} model turns."
    # /snippet

    if stopped:
        yield tracer.event(
            "agent_step",
            StageClock(),
            {"tool": "stop", "input": {}, "stopped": stopped, "caps": caps, "found": len(found)},
            status="warning",
            label=step_label(searches),
        )
    # The context: every passage the searches found, best-ranked first, first search first.
    ordered = sorted(found.items(), key=lambda item: (item[1][0], item[1][1]))
    cap = min(len(ordered), params.k * max(searches, 1), settings.max_top_k * 2)
    out.ranking = "agent"
    out.selected = [(cid, float(rank)) for cid, (rank, _) in ordered[:cap]]
