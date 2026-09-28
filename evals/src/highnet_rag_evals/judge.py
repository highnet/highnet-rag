"""Faithfulness and correctness, graded by a judge model (CLAUDE_MODEL_JUDGE).

The judge sees the question, the passages the pipeline retrieved, the answer split into
sentences, and the expected answer when there is one. It must reply through the `grade` tool:
one verdict per sentence (supported by the passages or not) and whether the answer is correct.
"""

import json
import re
from dataclasses import dataclass
from typing import Any

from highnet_rag.config import Settings
from highnet_rag.providers.base import Judge, ToolAnswer
from highnet_rag.providers.claude import ClaudeJudge
from highnet_rag.providers.fake import words

JUDGE_SYSTEM = """You grade answers from a retrieval-augmented question-answering system. \
The user message is JSON with the question, the numbered passages the system retrieved, the \
system's answer split into numbered sentences, and the expected answer (null when the question \
has no answer in the corpus).

For each sentence, decide whether it is supported: everything it states follows from the \
passages alone, not from general knowledge. A sentence that only restates the question or \
connects other sentences, adding no fact of its own, counts as supported.

Then decide whether the answer is correct: it gives the expected answer (the same fact, in any \
wording). Set correct to null when the expected answer is null. Reply only through the grade \
tool."""

GRADE_TOOL: dict[str, Any] = {
    "name": "grade",
    "description": "Record the verdict for every sentence and for the answer as a whole.",
    "input_schema": {
        "type": "object",
        "properties": {
            "sentences": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "index": {"type": "integer"},
                        "supported": {"type": "boolean"},
                    },
                    "required": ["index", "supported"],
                },
            },
            "correct": {"type": ["boolean", "null"]},
        },
        "required": ["sentences", "correct"],
    },
}

SENTENCE_END = re.compile(r"(?<=[.!?])\s+")


def split_sentences(text: str) -> list[str]:
    return [s.strip() for s in SENTENCE_END.split(text) if s.strip()]


@dataclass
class Grade:
    supported: int
    sentences: int
    correct: bool | None
    input_tokens: int
    output_tokens: int


def grade_prompt(question: str, passages: list[str], answer: str, expected: str | None) -> str:
    return json.dumps(
        {
            "question": question,
            "passages": [{"number": i + 1, "text": p} for i, p in enumerate(passages)],
            "answer_sentences": [
                {"index": i, "text": s} for i, s in enumerate(split_sentences(answer))
            ],
            "expected_answer": expected,
        },
        ensure_ascii=False,
    )


def parse_grade(result: ToolAnswer, sentences: int) -> Grade:
    verdicts = {
        int(v["index"]): bool(v["supported"])
        for v in result.input.get("sentences", [])
        if isinstance(v, dict) and "index" in v and "supported" in v
    }
    # A sentence the judge skipped counts as unsupported: missing evidence is not a pass.
    supported = sum(1 for i in range(sentences) if verdicts.get(i, False))
    correct = result.input.get("correct")
    return Grade(
        supported=supported,
        sentences=sentences,
        correct=correct if isinstance(correct, bool) else None,
        input_tokens=result.input_tokens,
        output_tokens=result.output_tokens,
    )


async def grade_answer(
    judge: Judge, question: str, passages: list[str], answer: str, expected: str | None
) -> Grade:
    prompt = grade_prompt(question, passages, answer, expected)
    result = await judge.call(JUDGE_SYSTEM, prompt, GRADE_TOOL)
    return parse_grade(result, len(split_sentences(answer)))


class FakeJudge:
    """Offline judge for tests and fake runs: word overlap, no model. Its grades are illustrative.

    A sentence is supported when most of its words appear in the passages; the answer is correct
    when every word of the expected answer appears in it.
    """

    provider = "fake"
    model = "fake-judge"

    async def call(self, system: str, prompt: str, tool: dict[str, Any]) -> ToolAnswer:
        data = json.loads(prompt)
        vocabulary = {w for p in data["passages"] for w in words(p["text"])}
        verdicts = []
        for sentence in data["answer_sentences"]:
            said = set(words(sentence["text"]))
            verdicts.append(
                {
                    "index": sentence["index"],
                    "supported": len(said & vocabulary) * 2 >= len(said),
                }
            )
        expected = data["expected_answer"]
        answer = {w for s in data["answer_sentences"] for w in words(s["text"])}
        correct = None if expected is None else set(words(expected)) <= answer
        return ToolAnswer(
            input={"sentences": verdicts, "correct": correct},
            input_tokens=len(prompt) // 4,
            output_tokens=len(json.dumps(verdicts)) // 4,
        )


def build_judge(settings: Settings) -> Judge:
    """CLAUDE_MODEL_JUDGE, or the offline judge when FAKE_PROVIDERS is set."""
    if settings.fake_providers:
        return FakeJudge()
    return ClaudeJudge(settings, settings.claude_model_judge)
