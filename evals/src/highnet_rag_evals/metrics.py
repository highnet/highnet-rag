"""Retrieval metrics. A chunk is relevant when it contains a gold answer's character span."""

from collections.abc import Sequence


def relevant_chunks(
    spans: Sequence[tuple[int, int]], chunks: Sequence[tuple[int, int, int]]
) -> set[int]:
    """spans: gold (start, end) offsets; chunks: (chunk_id, start, end) in the same document."""
    return {cid for cid, cs, ce in chunks for s, e in spans if cs <= s and e <= ce}


def recall_at_k(ranked: Sequence[int], relevant: set[int], k: int) -> float:
    """1.0 if any relevant chunk is in the top k (SQuAD has one answer location per question)."""
    if not relevant:
        raise ValueError("recall@k is undefined for questions without a relevant chunk")
    return 1.0 if relevant.intersection(ranked[:k]) else 0.0


def reciprocal_rank(ranked: Sequence[int], relevant: set[int]) -> float:
    for i, chunk_id in enumerate(ranked, start=1):
        if chunk_id in relevant:
            return 1.0 / i
    return 0.0


def mean(values: Sequence[float]) -> float:
    return sum(values) / len(values) if values else 0.0
