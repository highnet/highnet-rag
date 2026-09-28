"""Ingestion: load -> chunk -> embed -> store (+ FTS5, sqlite-vec) -> PCA. Runs locally; the
resulting file is uploaded to the Fly volume (scripts/upload-corpus.sh)."""

import json
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

from highnet_rag.config import Settings
from highnet_rag.ingest.chunk import CHUNK_SPECS, chunk_text
from highnet_rag.ingest.pca import fit_pca, project
from highnet_rag.ingest.squad import SQUAD_DEV_URL, Article
from highnet_rag.pricing import cost_usd
from highnet_rag.providers.base import Embedder
from highnet_rag.storage.sqlite import CORPUS_SCHEMA, connect_corpus, vec_table_sql


@dataclass
class ChunkSetReport:
    name: str
    chunks: int
    embed_tokens: int
    cost_usd: float
    explained_variance: tuple[float, float]


@dataclass
class IngestReport:
    build_id: str
    documents: int
    embed_model: str
    sets: list[ChunkSetReport] = field(default_factory=list)

    @property
    def cost_usd(self) -> float:
        return round(sum(s.cost_usd for s in self.sets), 6)


async def build_corpus(
    articles: list[Article],
    out: Path,
    embedder: Embedder,
    settings: Settings,
    set_names: list[str],
    *,
    batch_size: int = 128,
    log: Callable[[str], None] = print,
) -> IngestReport:
    unknown = [n for n in set_names if n not in CHUNK_SPECS]
    if unknown:
        raise ValueError(f"Unknown chunk sets {unknown}; choose from {list(CHUNK_SPECS)}")

    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".building")
    tmp.unlink(missing_ok=True)
    conn = connect_corpus(tmp, readonly=False)
    conn.executescript(CORPUS_SCHEMA)
    conn.execute(vec_table_sql(embedder.dims))

    report = IngestReport(uuid.uuid4().hex[:12], len(articles), embedder.model)
    meta = {
        "build_id": report.build_id,
        "built_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "embed_provider": embedder.provider,
        "embed_model": embedder.model,
        "embed_dims": str(embedder.dims),
        "corpus": "SQuAD 2.0 dev",
        "licence": "CC BY-SA 4.0",
        "source_url": SQUAD_DEV_URL,
    }
    conn.executemany("INSERT INTO meta (key, value) VALUES (?, ?)", meta.items())
    for doc_id, article in enumerate(articles, start=1):
        conn.execute(
            "INSERT INTO documents (id, title, text, source_url) VALUES (?, ?, ?, ?)",
            (doc_id, article.title, article.text, article.source_url),
        )

    for set_id, name in enumerate(set_names, start=1):
        spec = CHUNK_SPECS[name]
        conn.execute(
            "INSERT INTO chunk_sets (id, name, target_tokens, overlap_tokens) VALUES (?, ?, ?, ?)",
            (set_id, spec.name, spec.target_tokens, spec.overlap_tokens),
        )
        rows: list[tuple[int, int, int, str, int, int, int]] = []
        for doc_id, article in enumerate(articles, start=1):
            for c in chunk_text(article.text, spec):
                rows.append((set_id, doc_id, c.ord, c.text, c.start, c.end, c.approx_tokens))
        log(f"[{name}] {len(rows)} chunks; embedding with {embedder.model}...")

        vectors: list[np.ndarray] = []
        tokens = 0
        for i in range(0, len(rows), batch_size):
            batch = [r[3] for r in rows[i : i + batch_size]]
            result = await embedder.embed(batch, "document")
            vectors.append(result.vectors)
            tokens += result.tokens
            log(f"[{name}] embedded {min(i + batch_size, len(rows))}/{len(rows)}")
        matrix = np.concatenate(vectors)

        mean, components, explained = fit_pca(matrix)
        coords = project(matrix, mean, components)
        for row, vec, (x, y) in zip(rows, matrix, coords, strict=True):
            cursor = conn.execute(
                "INSERT INTO chunks (chunk_set_id, doc_id, ord, text, start_char, end_char, "
                "approx_tokens, x, y) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (*row, float(x), float(y)),
            )
            chunk_id = cursor.lastrowid
            conn.execute(
                "INSERT INTO chunks_fts (rowid, text, chunk_set_id) VALUES (?, ?, ?)",
                (chunk_id, row[3], set_id),
            )
            conn.execute(
                "INSERT INTO chunk_vec (chunk_id, chunk_set_id, embedding) VALUES (?, ?, ?)",
                (chunk_id, set_id, vec.astype(np.float32).tobytes()),
            )
        conn.execute(
            "INSERT INTO pca (chunk_set_id, mean, components, explained_variance) "
            "VALUES (?, ?, ?, ?)",
            (set_id, mean.tobytes(), components.tobytes(), json.dumps(list(explained))),
        )
        cost = cost_usd(embedder.model, settings, tokens)
        report.sets.append(ChunkSetReport(name, len(rows), tokens, cost, explained))

    conn.commit()
    conn.execute("VACUUM")
    conn.close()
    tmp.replace(out)
    return report
