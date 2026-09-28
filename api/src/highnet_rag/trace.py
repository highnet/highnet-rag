"""Trace events: the product. One event per pipeline stage, emitted as the stage finishes.

The Pydantic models here are the source of truth for the frontend types
(`highnet-rag schema` -> web/lib/generated/).
"""

import time
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

Stage = Literal[
    "request",
    "embed_query",
    "map_project",
    "bm25",
    "vector",
    "fuse",
    "rerank",
    "select_context",
    "prompt",
    "generate",
    "citations",
    "agent_plan",
    "agent_step",
]
Status = Literal["ok", "skipped", "error", "warning"]


# Fields with defaults are always serialized, so the generated TS types mark them required.
WIRE = ConfigDict(json_schema_serialization_defaults_required=True)


class TraceEvent(BaseModel):
    """SSE `event: trace`."""

    model_config = WIRE

    run_id: str
    seq: int = Field(description="Emission order within the run, starting at 1.")
    stage: Stage
    status: Status = "ok"
    parent: str | None = Field(default=None, description="Parent agent_step id (agentic mode).")
    label: str = Field(description="Step number shown on the pad, e.g. '5' or '4b'.")
    data: dict[str, Any] = Field(default_factory=dict)
    ms: int = Field(description="Wall time of this stage in milliseconds.")
    tokens: int = Field(default=0, description="Tokens billed by this stage.")
    cost_usd: float = Field(default=0.0, description="Cost of this stage in USD.")


class AnswerDelta(BaseModel):
    """SSE `event: answer_delta` - streamed answer text while `generate` runs."""

    model_config = WIRE

    run_id: str
    text: str


class RunDone(BaseModel):
    """SSE `event: done` - always the last event of a run."""

    model_config = WIRE

    run_id: str
    status: Literal["ok", "error", "limited"]
    ms: int
    tokens: int
    cost_usd: float
    stages: int


class Tracer:
    """Assigns sequence numbers, measures stage time and accumulates totals for one run."""

    def __init__(self, run_id: str) -> None:
        self.run_id = run_id
        self.seq = 0
        self.tokens = 0
        self.cost_usd = 0.0
        self.started = time.perf_counter()
        self.failed = False

    def event(
        self,
        stage: Stage,
        clock: "StageClock",
        data: dict[str, Any],
        *,
        status: Status = "ok",
        tokens: int = 0,
        cost_usd: float = 0.0,
        parent: str | None = None,
        label: str | None = None,
    ) -> TraceEvent:
        self.seq += 1
        self.tokens += tokens
        self.cost_usd = round(self.cost_usd + cost_usd, 6)
        if status == "error":
            self.failed = True
        return TraceEvent(
            run_id=self.run_id,
            seq=self.seq,
            stage=stage,
            status=status,
            parent=parent,
            label=label or str(self.seq),
            data=data,
            ms=clock.ms(),
            tokens=tokens,
            cost_usd=cost_usd,
        )

    def skipped(self, stage: Stage, reason: str) -> TraceEvent:
        return self.event(stage, StageClock(), {"reason": reason}, status="skipped")

    def error(self, stage: Stage, clock: "StageClock", exc: BaseException) -> TraceEvent:
        return self.event(
            stage,
            clock,
            {"error": {"type": type(exc).__name__, "message": str(exc)}},
            status="error",
        )

    def done(self, status: Literal["ok", "error", "limited"] | None = None) -> RunDone:
        return RunDone(
            run_id=self.run_id,
            status=status or ("error" if self.failed else "ok"),
            ms=round((time.perf_counter() - self.started) * 1000),
            tokens=self.tokens,
            cost_usd=self.cost_usd,
            stages=self.seq,
        )


class StageClock:
    def __init__(self) -> None:
        self.start = time.perf_counter()

    def ms(self) -> int:
        return round((time.perf_counter() - self.start) * 1000)
