import pytest

from highnet_rag_evals.metrics import mean, recall_at_k, reciprocal_rank, relevant_chunks


def test_relevant_chunks_need_the_whole_span() -> None:
    chunks = [(1, 0, 100), (2, 80, 200), (3, 190, 300)]
    assert relevant_chunks([(90, 99)], chunks) == {1, 2}
    assert relevant_chunks([(95, 150)], chunks) == {2}
    assert relevant_chunks([(150, 250)], chunks) == set()


def test_recall_and_mrr() -> None:
    ranked = [7, 3, 9]
    assert recall_at_k(ranked, {9}, 2) == 0.0
    assert recall_at_k(ranked, {9}, 3) == 1.0
    assert reciprocal_rank(ranked, {3}) == pytest.approx(0.5)
    assert reciprocal_rank(ranked, {42}) == 0.0
    assert mean([1.0, 0.0]) == 0.5


def test_recall_requires_a_relevant_chunk() -> None:
    with pytest.raises(ValueError):
        recall_at_k([1], set(), 1)
