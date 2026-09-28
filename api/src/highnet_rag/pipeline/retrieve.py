"""Pure retrieval helpers: the FTS5 query built from a question, and reciprocal rank fusion.

Both are plain functions so the trace can show exactly what they produced.
"""

import re
from dataclasses import dataclass

from highnet_rag.storage.base import Hit

RRF_K = 60

# Question words and glue that match almost every passage. BM25's IDF would down-weight them
# anyway; dropping them keeps the MATCH string short enough to read in the trace.
# fmt: off
STOPWORDS = frozenset([
    "a", "about", "an", "and", "are", "as", "at", "be", "by", "did", "do", "does", "for", "from",
    "had", "has", "have", "how", "i", "in", "is", "it", "its", "of", "on", "or", "that", "the",
    "their", "them", "there", "these", "they", "this", "to", "was", "were", "what", "when",
    "where", "which", "who", "whom", "whose", "why", "will", "with",
])
# fmt: on


# snippet: bm25 | Turn the question into an FTS5 query
def fts_query(question: str) -> tuple[str, list[str]]:
    """OR together the question's distinct non-stopword terms, each quoted as a literal.

    Quoting means FTS5 never parses user text as query syntax (AND, NEAR, column filters).
    """
    terms: list[str] = []
    for word in re.findall(r"\w+", question.lower()):
        if word not in STOPWORDS and word not in terms:
            terms.append(word)
    return " OR ".join(f'"{t}"' for t in terms), terms


# /snippet


@dataclass(frozen=True)
class Fused:
    chunk_id: int
    rank: int
    score: float
    ranks: dict[str, int | None]  # the chunk's rank in each input list, None if absent
    contributions: dict[str, float]  # 1 / (RRF_K + rank) per list it appeared in


# snippet: fuse | Reciprocal rank fusion
def rrf(lists: dict[str, list[Hit]], k: int = RRF_K) -> list[Fused]:
    """Score each chunk by the sum of 1 / (k + rank) over every list it appears in.

    Only ranks matter, never raw scores, so BM25 scores and cosine distances need no
    normalising. Ties go to the chunk with the better best rank, then the lower id.
    """
    ranks: dict[int, dict[str, int]] = {}
    for name, hits in lists.items():
        for hit in hits:
            ranks.setdefault(hit.chunk_id, {})[name] = hit.rank
    scored = []
    for chunk_id, by_list in ranks.items():
        contributions = {name: 1.0 / (k + rank) for name, rank in by_list.items()}
        scored.append((sum(contributions.values()), min(by_list.values()), chunk_id, by_list))
    scored.sort(key=lambda s: (-s[0], s[1], s[2]))
    return [
        Fused(
            chunk_id=chunk_id,
            rank=i + 1,
            score=score,
            ranks={name: by_list.get(name) for name in lists},
            contributions={name: 1.0 / (k + r) for name, r in by_list.items()},
        )
        for i, (score, _, chunk_id, by_list) in enumerate(scored)
    ]


# /snippet
