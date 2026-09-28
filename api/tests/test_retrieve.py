import math

from highnet_rag.pipeline.retrieve import RRF_K, bm25_idf, fts_query, question_words, rrf
from highnet_rag.storage.base import Hit


def test_fts_query_quotes_distinct_terms_and_drops_stop_words() -> None:
    match, terms = fts_query('Who is the "king" of the Normans, AND who NEAR the king?')
    assert terms == ["king", "normans", "near"]
    assert match == '"king" OR "normans" OR "near"'


def test_fts_query_of_only_stop_words_is_empty() -> None:
    assert fts_query("What is it?") == ("", [])


def test_rrf_sums_reciprocal_ranks_and_records_each_contribution() -> None:
    fused = rrf(
        {
            "bm25": [Hit(10, 1, 9.0), Hit(20, 2, 5.0)],
            "vector": [Hit(20, 1, 0.1), Hit(30, 2, 0.2)],
        }
    )
    assert [f.chunk_id for f in fused] == [20, 10, 30]
    assert [f.rank for f in fused] == [1, 2, 3]
    top = fused[0]
    assert top.score == 1 / (RRF_K + 2) + 1 / (RRF_K + 1)
    assert top.ranks == {"bm25": 2, "vector": 1}
    assert fused[2].ranks == {"bm25": None, "vector": 2}
    assert fused[2].contributions == {"vector": 1 / (RRF_K + 2)}


def test_rrf_breaks_ties_by_best_rank_then_id() -> None:
    fused = rrf({"a": [Hit(7, 1, 0), Hit(5, 2, 0)], "b": [Hit(5, 1, 0), Hit(7, 2, 0)]})
    assert [f.chunk_id for f in fused] == [5, 7]


def test_bm25_idf_matches_fts5_and_floors_common_terms() -> None:
    assert bm25_idf(1000, 9) == math.log((1000 - 9 + 0.5) / (9 + 0.5))
    assert bm25_idf(1000, 9) > bm25_idf(1000, 90)
    assert bm25_idf(10, 9) == 1e-6  # in nearly every chunk: weighs (almost) nothing


def test_question_words_mark_stop_words() -> None:
    assert question_words("Who founded Rome?") == [
        {"word": "Who", "term": None},
        {"word": "founded", "term": "founded"},
        {"word": "Rome", "term": "rome"},
    ]
