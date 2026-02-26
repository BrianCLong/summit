import pytest
from summit.embeddings.local_provider import LocalEmbeddingProvider
from summit.graph.semantic_bridges import SemanticBridgeEngine, cosine_similarity

def test_deterministic_embeddings():
    provider = LocalEmbeddingProvider()
    e1 = provider.embed_text("Test content")
    e2 = provider.embed_text("Test content")
    assert e1 == e2

    e3 = provider.embed_text("Different content")
    assert e1 != e3

def test_similarity_engine():
    provider = LocalEmbeddingProvider()
    engine = SemanticBridgeEngine(provider)

    notes = [
        {"doc_id": "doc1", "chunk_idx": 0, "content": "Content A"},
        {"doc_id": "doc2", "chunk_idx": 0, "content": "Content B"},
        {"doc_id": "doc1", "chunk_idx": 1, "content": "Content A chunk 2"}
    ]

    bridges = engine.find_bridges(notes)

    # Bridges should only be between doc1 and doc2
    for b in bridges:
        assert b["source_doc"] != b["target_doc"]

    assert len(bridges) > 0
    assert "similarity_score" in bridges[0]

def test_cosine_similarity():
    v1 = [1.0, 0.0]
    v2 = [1.0, 0.0]
    assert cosine_similarity(v1, v2) == pytest.approx(1.0)

    v3 = [0.0, 1.0]
    assert cosine_similarity(v1, v3) == pytest.approx(0.0)
