"""Sentence-aligned chunking with overlap. Chunks never cross an article boundary, and keep
character offsets into the article so gold answer spans map to chunks exactly."""

import re
from dataclasses import dataclass

from highnet_rag.providers.fake import approx_tokens

SENTENCE_END = re.compile(r"[.!?][\"')\]]*\s+")


@dataclass(frozen=True)
class ChunkSpec:
    name: str
    target_tokens: int
    overlap_tokens: int


CHUNK_SPECS: dict[str, ChunkSpec] = {
    "small": ChunkSpec("small", 100, 15),
    "medium": ChunkSpec("medium", 250, 40),
    "large": ChunkSpec("large", 500, 75),
}


@dataclass(frozen=True)
class TextChunk:
    ord: int
    start: int
    end: int
    text: str
    approx_tokens: int


def sentence_spans(text: str) -> list[tuple[int, int]]:
    """(start, end) of each sentence; paragraph breaks always end a sentence."""
    spans: list[tuple[int, int]] = []
    para_start = 0
    for para in text.split("\n\n"):
        cursor = 0
        for match in SENTENCE_END.finditer(para):
            end = match.end()
            sentence = para[cursor:end].rstrip()
            if sentence:
                spans.append((para_start + cursor, para_start + cursor + len(sentence)))
            cursor = end
        tail = para[cursor:].rstrip()
        if tail:
            spans.append((para_start + cursor, para_start + cursor + len(tail)))
        para_start += len(para) + 2
    return spans


def chunk_text(text: str, spec: ChunkSpec) -> list[TextChunk]:
    spans = sentence_spans(text)
    sizes = [approx_tokens(text[s:e]) for s, e in spans]
    chunks: list[TextChunk] = []
    i = 0
    while i < len(spans):
        j, total = i, 0
        while j < len(spans) and (total == 0 or total + sizes[j] <= spec.target_tokens):
            total += sizes[j]
            j += 1
        start, end = spans[i][0], spans[j - 1][1]
        chunks.append(TextChunk(len(chunks), start, end, text[start:end], total))
        if j >= len(spans):
            break
        # Step back over trailing sentences to create the overlap, always moving forward.
        k, overlap = j, 0
        while k - 1 > i and overlap + sizes[k - 1] <= spec.overlap_tokens:
            k -= 1
            overlap += sizes[k]
        i = k
    return chunks
