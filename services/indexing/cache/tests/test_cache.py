from services.indexing.cache.embedding_cache import EmbeddingCache
def test_cache():
    c = EmbeddingCache()
    c.set("t1", [0.1])
    assert c.get("t1") == [0.1]
