import json

from highnet_rag.config import Settings
from highnet_rag.providers.base import ToolAnswer
from highnet_rag.providers.claude import ClaudeJudge
from highnet_rag_evals.judge import (
    FakeJudge,
    build_judge,
    grade_answer,
    grade_prompt,
    parse_grade,
    split_sentences,
)


def test_split_sentences() -> None:
    assert split_sentences("One. Two!  Three? ") == ["One.", "Two!", "Three?"]
    assert split_sentences("  ") == []


def test_prompt_is_json_with_numbered_parts() -> None:
    data = json.loads(grade_prompt("Q?", ["p1", "p2"], "A. B.", None))
    assert [p["number"] for p in data["passages"]] == [1, 2]
    assert [s["index"] for s in data["answer_sentences"]] == [0, 1]
    assert data["expected_answer"] is None


def test_parse_grade_counts_skipped_sentences_as_unsupported() -> None:
    answer = ToolAnswer(
        input={
            "sentences": [{"index": 0, "supported": True}, "junk", {"index": 1}],
            "correct": "x",
        },
        input_tokens=10,
        output_tokens=2,
    )
    grade = parse_grade(answer, sentences=3)
    assert (grade.supported, grade.sentences, grade.correct) == (1, 3, None)


async def test_fake_judge_grades_by_word_overlap() -> None:
    judge = FakeJudge()
    passages = ["Normandy is a region in France."]
    good = await grade_answer(judge, "Where?", passages, "Normandy is in France.", "France")
    assert (good.supported, good.sentences, good.correct) == (1, 1, True)
    bad = await grade_answer(judge, "Where?", passages, "It is in Spain near Madrid.", "France")
    assert (bad.supported, bad.correct) == (0, False)
    none = await grade_answer(judge, "Where?", passages, "France.", None)
    assert none.correct is None


def test_build_judge() -> None:
    assert isinstance(build_judge(Settings(fake_providers=True, _env_file=None)), FakeJudge)  # pyright: ignore[reportCallIssue]
    real = build_judge(Settings(claude_model_judge="claude-sonnet-5", _env_file=None))  # pyright: ignore[reportCallIssue]
    assert isinstance(real, ClaudeJudge) and real.model == "claude-sonnet-5"
