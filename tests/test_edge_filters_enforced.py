from graphrag.edge.cache import EdgeCache, CacheEntry
from graphrag.edge.service import EdgeService
import time

def test_edge_cache_hit():
    cache = EdgeCache()
    cache.put("q1", CacheEntry(["snippet"], [], int(time.time()) + 100))
    svc = EdgeService(cache)
    assert svc.get_context("q1") == ["snippet"]

def test_edge_cache_expired():
    cache = EdgeCache()
    cache.put("q1", CacheEntry(["snippet"], [], int(time.time()) - 100))
    svc = EdgeService(cache)
    assert svc.get_context("q1") is None

def test_edge_cache_pii_filtered():
    cache = EdgeCache()
    # "PII" is flagged by stub filter
    cache.put("q1", CacheEntry(["some PII data"], [], int(time.time()) + 100))
    svc = EdgeService(cache)
    assert svc.get_context("q1") is None

def test_edge_cache_injection_filtered():
    cache = EdgeCache()
    cache.put("q1", CacheEntry(["DROP TABLE users"], [], int(time.time()) + 100))
    svc = EdgeService(cache)
    assert svc.get_context("q1") is None
