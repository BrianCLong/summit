import pytest
import numpy as np
from tests.fixtures.vector.mock_vector_db import MockVectorDB, VectorStoreIntegration

@pytest.fixture
def store():
    db = MockVectorDB()
    integration = VectorStoreIntegration(db)
    integration.build_index()
    return integration

def test_generate_embedding(store):
    text = "Hello world"
    emb1 = store.generate_embedding(text)
    emb2 = store.generate_embedding(text)

    assert len(emb1) == 128
    assert emb1 == emb2  # Should be deterministic

def test_embedding_cache_invalidation(store):
    text = "Cache test"
    emb1 = store.generate_embedding(text)
    assert text in store.embedding_cache

    store.invalidate_cache(text)
    assert text not in store.embedding_cache

    # After invalidation it might generate same due to mock, but cache should be populated again
    emb2 = store.generate_embedding(text)
    assert text in store.embedding_cache

def test_store_and_search_document(store):
    store.store_document("doc1", "The quick brown fox", {"category": "animals"})
    store.store_document("doc2", "Machine learning is fun", {"category": "tech"})

    results = store.similarity_search("learning", top_k=1)
    assert len(results) > 0

def test_batch_upsert(store):
    docs = [
        {"id": "doc1", "text": "Apple pie", "metadata": {"type": "food"}},
        {"id": "doc2", "text": "Banana bread", "metadata": {"type": "food"}},
        {"id": "doc3", "text": "Computer science", "metadata": {"type": "tech"}}
    ]
    store.batch_upsert(docs)

    assert "doc1" in store.db.storage
    assert "doc2" in store.db.storage
    assert "doc3" in store.db.storage
    assert len(store.db.storage) == 3

def test_similarity_search_metrics(store):
    docs = [
        {"id": "doc1", "text": "Machine learning", "metadata": {}},
        {"id": "doc2", "text": "Artificial intelligence", "metadata": {}}
    ]
    store.batch_upsert(docs)

    results_cosine = store.similarity_search("AI", metric="cosine")
    results_dot = store.similarity_search("AI", metric="dot")

    assert len(results_cosine) == 2
    assert len(results_dot) == 2
    assert all("score" in r for r in results_cosine)

    with pytest.raises(ValueError):
        store.similarity_search("AI", metric="unknown")

def test_similarity_search_with_filters(store):
    docs = [
        {"id": "doc1", "text": "Dog", "metadata": {"type": "animal", "domestic": True}},
        {"id": "doc2", "text": "Cat", "metadata": {"type": "animal", "domestic": True}},
        {"id": "doc3", "text": "Wolf", "metadata": {"type": "animal", "domestic": False}}
    ]
    store.batch_upsert(docs)

    results = store.similarity_search("pet", filters={"domestic": True})
    assert len(results) == 2
    for r in results:
        assert r["id"] in ["doc1", "doc2"]

    results = store.similarity_search("wild", filters={"domestic": False})
    assert len(results) == 1
    assert results[0]["id"] == "doc3"

def test_hybrid_search(store):
    docs = [
        {"id": "node1", "text": "Graph theory", "metadata": {}},
        {"id": "node2", "text": "Vector spaces", "metadata": {}},
        {"id": "node3", "text": "Graph traversal", "metadata": {}}
    ]
    store.batch_upsert(docs)

    # Regular search
    results_regular = store.similarity_search("graphs", top_k=3)

    # Hybrid search boosting specific nodes from a graph traversal
    results_hybrid = store.hybrid_search("graphs", graph_nodes=["node3"], top_k=3)

    assert len(results_hybrid) > 0
    # Boost should affect the score for node3
    boosted_node = next(r for r in results_hybrid if r["id"] == "node3")
    regular_node = next(r for r in results_regular if r["id"] == "node3")
    assert boosted_node["score"] > regular_node["score"]

def test_index_building(store):
    db = MockVectorDB()
    integration = VectorStoreIntegration(db)

    integration.store_document("doc1", "test", {})

    # Query before building index
    with pytest.raises(ValueError):
        integration.similarity_search("test")

    integration.build_index()
    results = integration.similarity_search("test")
    assert len(results) == 1

    # Rebuild index should succeed
    integration.rebuild_index()
    results = integration.similarity_search("test")
    assert len(results) == 1
