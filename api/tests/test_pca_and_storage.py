from pathlib import Path

import numpy as np
from highnet_rag.ingest.pca import fit_pca, project
from highnet_rag.providers.fake import hashed_vector
from highnet_rag.storage.sqlite import SqliteCorpusStore


def test_pca_components_are_orthonormal_and_ordered() -> None:
    rng = np.random.default_rng(0)
    x = rng.normal(size=(200, 16)) * np.linspace(5, 1, 16)
    mean, components, (pc1, pc2) = fit_pca(x)
    assert components.shape == (2, 16)
    np.testing.assert_allclose(components @ components.T, np.eye(2), atol=1e-5)
    assert pc1 >= pc2 > 0
    assert project(x, mean, components).shape == (200, 2)


def test_store_projection_matches_ingest_coordinates(corpus_path: Path) -> None:
    store = SqliteCorpusStore(corpus_path)
    medium = next(s for s in store.chunk_sets() if s.name == "medium")
    chunk = store.chunks([store.map_points(medium.id)[0].chunk_id])[0]
    x, y = store.projection(medium.id).project(hashed_vector(chunk.text, 64))
    assert abs(x - chunk.x) < 1e-4 and abs(y - chunk.y) < 1e-4


def test_knn_finds_the_matching_article(corpus_path: Path) -> None:
    store = SqliteCorpusStore(corpus_path)
    medium = next(s for s in store.chunk_sets() if s.name == "medium")
    hits = store.knn(hashed_vector("Oxygen chemical element Scheele", 64), medium.id, 2)
    assert store.chunks([hits[0].chunk_id])[0].doc_title == "Oxygen"
    assert [h.rank for h in hits] == [1, 2]


def test_bm25_is_filtered_by_chunk_set(corpus_path: Path) -> None:
    store = SqliteCorpusStore(corpus_path)
    sets = {s.name: s.id for s in store.chunk_sets()}
    hits = store.bm25('"rainforest"', sets["small"], 5)
    assert hits and all(
        c.chunk_set_id == sets["small"] for c in store.chunks([h.chunk_id for h in hits])
    )
