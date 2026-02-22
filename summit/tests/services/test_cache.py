import pytest
from unittest.mock import AsyncMock, patch
from summit.services.cache import CacheService

@pytest.mark.asyncio
async def test_cache_get():
    with patch("summit.services.cache.RedisClient") as MockRedis:
        mock_redis_instance = MockRedis.return_value
        mock_redis_instance.get.return_value = "value"

        service = CacheService()
        val = await service.get("key")
        assert val == "value"
        mock_redis_instance.get.assert_called_with("key")

@pytest.mark.asyncio
async def test_cache_set():
    with patch("summit.services.cache.RedisClient") as MockRedis:
        mock_redis_instance = MockRedis.return_value
        mock_redis_instance.set.return_value = True

        service = CacheService()
        success = await service.set("key", "value", ttl=100)
        assert success is True
        mock_redis_instance.set.assert_called_with("key", "value", 100)
