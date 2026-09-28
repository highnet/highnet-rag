"""The published eval results (evals/results/latest.json). The site renders only these numbers.

These models are the source of truth for the web types (`npm run gen:types`).
"""

from typing import Literal

from pydantic import BaseModel

SCHEMA_VERSION = 1
RECALL_KS = (1, 3, 5, 10)


class Rate(BaseModel):
    """A share with its counts, so the page can say "41 of 50" as well as "82%"."""

    count: int
    of: int
    value: float | None  # count / of, or None when `of` is 0

    @classmethod
    def of_counts(cls, count: int, of: int) -> "Rate":
        return cls(count=count, of=of, value=round(count / of, 4) if of else None)


class ModelRef(BaseModel):
    provider: str
    model: str


class RunInfo(BaseModel):
    started_at: str
    finished_at: str
    duration_s: float
    git_sha: str | None
    illustrative: bool  # True when fake providers produced these numbers
    corpus_build_id: str
    corpus_built_at: str
    embed: ModelRef
    rerank: ModelRef
    answer: ModelRef
    judge: ModelRef


class GoldenSetInfo(BaseModel):
    name: Literal["squad_auto", "owner", "compound"]
    questions: int
    answerable: int
    unanswerable: int


class RetrievalConfig(BaseModel):
    mode: str
    chunk_set: str
    rerank: bool
    questions: int
    errors: int
    recall: dict[str, float]  # "1", "3", "5", "10" -> share of questions with a hit in the top k
    mrr: float
    mean_ms: float  # search, fusion and rerank; the question's embedding is left out
    cost_usd: float


class RetrievalResults(BaseModel):
    depth: int
    ks: list[int]
    questions: int
    # Answerable questions whose gold answer no single chunk of a set contains, per chunk set.
    unmatched: dict[str, int]
    configs: list[RetrievalConfig]


class AnswerConfig(BaseModel):
    mode: str
    chunk_set: str
    k: int
    rerank: bool


class AnswerableResults(BaseModel):
    questions: int
    errors: int
    abstained: Rate  # said "not in the passages" although the corpus has the answer
    correct: Rate  # judged correct, over all answerable questions
    evidence_in_context: Rate  # a chunk holding the gold answer was among the passages sent
    correct_with_evidence: Rate  # correct, among questions whose evidence was sent
    faithfulness: float | None  # mean share of supported sentences, over judged answers
    fully_supported: Rate  # judged answers whose every sentence is supported


class UnanswerableResults(BaseModel):
    questions: int
    errors: int
    abstained: Rate  # the right behaviour: the corpus does not hold the answer
    faithfulness: float | None  # over the answers given anyway
    fully_supported: Rate


class AnswerResults(BaseModel):
    config: AnswerConfig
    answerable: AnswerableResults
    unanswerable: UnanswerableResults
    mean_ms: float
    mean_cost_usd: float


class CompoundResults(BaseModel):
    pipeline: Literal["classic", "agentic"]
    questions: int
    errors: int
    all_articles_found: Rate  # every article the question needs was among the passages
    article_coverage: float  # mean share of the needed articles found
    correct: Rate
    abstained: Rate
    faithfulness: float | None
    mean_searches: float
    mean_tokens: float
    mean_ms: float
    mean_cost_usd: float


class CostLine(BaseModel):
    provider: str
    model: str
    calls: int
    input_tokens: int
    output_tokens: int
    cost_usd: float


class CostResults(BaseModel):
    total_usd: float
    by_model: list[CostLine]


class EvalResults(BaseModel):
    schema_version: int = SCHEMA_VERSION
    run: RunInfo
    golden: list[GoldenSetInfo]
    retrieval: RetrievalResults
    # None when the run measured retrieval only (answers cost model calls; see `--retrieval-only`).
    answers: AnswerResults | None
    compound: list[CompoundResults] | None
    cost: CostResults
