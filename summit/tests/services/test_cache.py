import pytest
from unittest.mock import MagicMock, patch
from summit.services.cache import CacheService

@pytest.mark.asyncio
async def test_cache_service_get():
    with patch('summit.services.cache.RedisClient') as MockRedisClient:
        mock_redis = MockRedisClient.return_value
        mock_redis.get.return_value = {"foo": "bar"}

        service = CacheService()
        result = await service.get("test_key")

        assert result == {"foo": "bar"}
        mock_redis.get.assert_called_once_with("test_key")

@pytest.mark.asyncio
async def test_cache_service_set():
    with patch('summit.services.cache.RedisClient') as MockRedisClient:
        mock_redis = MockRedisClient.return_value
        mock_redis.set.return_value = True

        service = CacheService()
        result = await service.set("test_key", {"foo": "bar"})

        assert result is True
        mock_redis.set.assert_called_once_with("test_key", {"foo": "bar"}, 3600)

@pytest.mark.asyncio
async def test_cache_service_delete():
    with patch('summit.services.cache.RedisClient') as MockRedisClient:
        mock_redis = MockRedisClient.return_value
        mock_redis.delete.return_value = True

        service = CacheService()
        result = await service.delete("test_key")

        assert result is True
        mock_redis.delete.assert_called_once_with("test_key")
