import pytest
import time
import json
import hashlib
import asyncio
from typing import Any
import sys
from unittest.mock import patch, MagicMock

# Mock redis module completely since we don't have it installed in the current environment
# and we are specifically tasked with testing the cache *layer* logic with an in-memory mock.
sys.modules['redis'] = MagicMock()

# Import the actual caching layer components to test
from api.llm_provider import LLMProvider, MockLLMProvider
from python.intelgraph_py.cache import generate_cache_key, get_cached_explanation, set_cached_explanation

class InMemRedisBackend:
    def __init__(self, max_memory_items=100):
        self.store = {}
        self.expirations = {}
        self.max_items = max_memory_items

    def get(self, key):
        if key in self.store:
            if key in self.expirations and time.time() > self.expirations[key]:
                self.delete(key)
                return None
            return self.store[key]
        return None

    def setex(self, key, ttl, value):
        if len(self.store) >= self.max_items and key not in self.store:
            self._evict()

        self.store[key] = value
        self.expirations[key] = time.time() + ttl
        return True

    def delete(self, key):
        if key in self.store:
            del self.store[key]
        if key in self.expirations:
            del self.expirations[key]

    def ping(self):
        return True

    def _evict(self):
        now = time.time()
        expired_keys = [k for k, v in self.expirations.items() if now > v]
        if expired_keys:
            for k in expired_keys:
                self.delete(k)
            if len(self.store) < self.max_items:
                return

        if self.store:
            first_key = next(iter(self.store))
            self.delete(first_key)


@pytest.fixture
def mock_redis():
    return InMemRedisBackend(max_memory_items=5)

@pytest.fixture
def llm_provider(mock_redis):
    provider = MockLLMProvider(cache_enabled=True)
    provider.redis_client = mock_redis
    return provider

def test_llm_cache_hit_miss(llm_provider):
    prompt = "Test prompt for hit miss"

    # Cache miss
    assert llm_provider.redis_client.get(llm_provider._generate_cache_key(prompt)) is None

    # Miss and set
    response1 = asyncio.run(llm_provider._cached_generate_text(prompt))

    # Hit
    assert llm_provider.redis_client.get(llm_provider._generate_cache_key(prompt)) is not None
    response2 = asyncio.run(llm_provider._cached_generate_text(prompt))

    # Since it's a mock provider that generates slightly different responses,
    # the cached response should exactly match the first response.
    assert response1.encode("utf-8") == response2.encode("utf-8")

def test_llm_cache_ttl_expiration(llm_provider):
    prompt = "Test prompt TTL"
    llm_provider.cache_ttl = 0.1

    asyncio.run(llm_provider._cached_generate_text(prompt))

    # Wait for expiry
    time.sleep(0.2)
    assert llm_provider.redis_client.get(llm_provider._generate_cache_key(prompt)) is None

def test_intelgraph_cache_key_deterministic():
    data1 = {"b": 2, "a": 1}
    data2 = {"a": 1, "b": 2}

    key1 = generate_cache_key(data1, "model-A", "auth")
    key2 = generate_cache_key(data2, "model-A", "auth")

    assert key1 == key2

@patch("python.intelgraph_py.cache.redis_client")
def test_intelgraph_set_get_cache(mock_client):
    mock_redis_backend = InMemRedisBackend()
    mock_client.setex.side_effect = mock_redis_backend.setex
    # Return string because set_cached_explanation dumps it to JSON and get_cached_explanation loads it
    mock_client.get.side_effect = lambda k: mock_redis_backend.get(k)

    key = "test_key"
    data = {"result": "success"}

    set_cached_explanation(key, data, ex=3600)

    # get_cached_explanation returns dict already
    assert get_cached_explanation(key) == data

def test_memory_limit_enforcement(llm_provider):
    # Our mock redis has max 5 items
    for i in range(5):
        asyncio.run(llm_provider._cached_generate_text(f"Prompt {i}"))

    assert llm_provider.redis_client.get(llm_provider._generate_cache_key("Prompt 0")) is not None

    # Add 6th item
    asyncio.run(llm_provider._cached_generate_text("Prompt 5"))

    # First item should be evicted (FIFO in python dict)
    assert llm_provider.redis_client.get(llm_provider._generate_cache_key("Prompt 0")) is None
    assert llm_provider.redis_client.get(llm_provider._generate_cache_key("Prompt 5")) is not None

def test_cache_serialization():
    data = {"nodes": [{"id": 1}], "edges": [{"source": 1, "target": 2}]}
    key = generate_cache_key(data, "test-model")

    mock_redis_backend = InMemRedisBackend()

    with patch("python.intelgraph_py.cache.redis_client") as mock_client:
        mock_client.setex.side_effect = mock_redis_backend.setex
        mock_client.get.side_effect = lambda k: mock_redis_backend.get(k)

        set_cached_explanation(key, data)
        retrieved = get_cached_explanation(key)

        assert retrieved == data
        assert isinstance(retrieved, dict)

def test_cache_invalidation_on_graph_update():
    # Simulate graph query caching invalidation pattern
    backend = InMemRedisBackend()
    graph_id = "graph123"
    key1 = f"graph_query:{graph_id}:1"
    key2 = f"graph_query:{graph_id}:2"
    key3 = f"graph_query:graph456:1"

    backend.setex(key1, 300, "result1")
    backend.setex(key2, 300, "result2")
    backend.setex(key3, 300, "result3")

    # Invalidation function simulation
    keys_to_delete = [k for k in backend.store.keys() if k.startswith(f"graph_query:{graph_id}:")]
    for k in keys_to_delete:
        backend.delete(k)

    assert backend.get(key1) is None
    assert backend.get(key2) is None
    assert backend.get(key3) == "result3"
