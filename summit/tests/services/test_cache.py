import pytest
import json
from unittest.mock import patch, MagicMock
from summit.services.cache import CacheService
from summit.cache.redis_client import RedisClient
import fakeredis

@pytest.fixture
def mock_redis():
    server = fakeredis.FakeServer()
    mock_redis = fakeredis.FakeRedis(server=server, decode_responses=True)
    with patch("summit.cache.redis_client.redis.Redis.from_url", return_value=mock_redis):
        # Reset singleton
        RedisClient._instance = None
        yield mock_redis
        RedisClient._instance = None

@pytest.mark.asyncio
async def test_cache_service_set_get(mock_redis):
    service = CacheService()
    key = "test_key"
    value = {"foo": "bar"}

    # Test Set
    success = await service.set(key, value)
    assert success is True

    # Test Get
    result = await service.get(key)
    assert result == value

@pytest.mark.asyncio
async def test_cache_service_delete(mock_redis):
    service = CacheService()
    key = "test_key"
    value = "test_value"

    await service.set(key, value)
    deleted = await service.delete(key)
    assert deleted is True

    result = await service.get(key)
    assert result is None

@pytest.mark.asyncio
async def test_cache_miss(mock_redis):
    service = CacheService()
    result = await service.get("non_existent")
    assert result is None
