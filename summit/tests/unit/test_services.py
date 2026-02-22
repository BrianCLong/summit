import pytest
import asyncio
import json
import fakeredis
from unittest.mock import AsyncMock, MagicMock, patch
from summit.services.cache import CacheService
from summit.services.shared.core_verification import CoreVerificationService
from summit.services.vector_search import VectorSearch
from summit.cache.redis_client import RedisClient

@pytest.fixture(autouse=True)
def reset_redis_client_singleton():
    RedisClient._instance = None
    yield
    RedisClient._instance = None

# Test CacheService using FakeRedis via RedisClient
@pytest.mark.asyncio
async def test_cache_service_integration_with_redis_client():
    # Patch redis.Redis.from_url to return a fakeredis instance
    fake_redis = fakeredis.FakeRedis(decode_responses=True)
    with patch("redis.Redis.from_url", return_value=fake_redis):
        cache = CacheService()

        # Test Set (RedisClient handles serialization)
        await cache.set("key", {"foo": "bar"})

        # Verify in fake_redis
        val_str = fake_redis.get("key")
        assert val_str == '{"foo": "bar"}'

        # Test Get (RedisClient handles deserialization)
        val = await cache.get("key")
        assert val == {"foo": "bar"}

        # Test Delete
        await cache.delete("key")
        val = await cache.get("key")
        assert val is None

@pytest.mark.asyncio
async def test_core_verification_service():
    # Mock CacheService and VectorSearch
    with patch("summit.services.shared.core_verification.CacheService") as MockCache, \
         patch("summit.services.shared.core_verification.VectorSearch") as MockVector:

        mock_cache_instance = AsyncMock()
        mock_cache_instance.get.return_value = None # Cache miss
        MockCache.return_value = mock_cache_instance

        service = CoreVerificationService()

        # Test verify_claim (cache miss)
        result = await service.verify_claim("some claim", product="test")

        assert result["verdict"] == "TRUE"
        assert result["confidence"] > 0
        mock_cache_instance.get.assert_called_once()
        mock_cache_instance.set.assert_called_once()

        # Test verify_claim (cache hit)
        mock_cache_instance.get.return_value = {"verdict": "FALSE", "confidence": 1.0}
        mock_cache_instance.get.reset_mock()
        mock_cache_instance.set.reset_mock()

        result_cached = await service.verify_claim("some claim", product="test")
        assert result_cached["verdict"] == "FALSE"
        mock_cache_instance.get.assert_called_once()
        mock_cache_instance.set.assert_not_called()
