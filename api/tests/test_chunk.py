from itertools import pairwise

from highnet_rag.ingest.chunk import ChunkSpec, chunk_text, sentence_spans

TEXT = (
    "First sentence is here. Second one follows! Third asks why?\n\n"
    "A new paragraph starts. It has two sentences."
)


def test_sentence_spans_respect_paragraphs() -> None:
    spans = [TEXT[s:e] for s, e in sentence_spans(TEXT)]
    assert spans == [
        "First sentence is here.",
        "Second one follows!",
        "Third asks why?",
        "A new paragraph starts.",
        "It has two sentences.",
    ]


def test_chunks_are_sentence_aligned_with_exact_offsets() -> None:
    chunks = chunk_text(TEXT, ChunkSpec("t", target_tokens=10, overlap_tokens=5))
    assert len(chunks) > 1
    for c in chunks:
        assert TEXT[c.start : c.end] == c.text
        assert c.text[-1] in ".!?"


def test_overlap_repeats_trailing_sentence_and_always_progresses() -> None:
    chunks = chunk_text(TEXT, ChunkSpec("t", target_tokens=10, overlap_tokens=6))
    starts = [c.start for c in chunks]
    assert starts == sorted(set(starts))
    assert any(b.start < a.end for a, b in pairwise(chunks))


def test_oversized_sentence_becomes_its_own_chunk() -> None:
    long = "word " * 200 + "end."
    chunks = chunk_text(long, ChunkSpec("t", target_tokens=10, overlap_tokens=2))
    assert len(chunks) == 1
