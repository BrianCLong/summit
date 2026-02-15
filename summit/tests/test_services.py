import pytest
import fakeredis
from unittest.mock import MagicMock, AsyncMock, patch
from summit.services.shared.core_verification import CoreVerificationService
from summit.services.cache import CacheService
from summit.cache.redis_client import RedisClient

# --- CacheService Tests ---

@pytest.fixture
def mock_redis():
    # Patch the redis.Redis.from_url to return a fakeredis client
    server = fakeredis.FakeServer()
    fake_client = fakeredis.FakeRedis(server=server, decode_responses=True)

    with patch("redis.Redis.from_url", return_value=fake_client):
        # Reset singleton instance to ensure we get a new one using our fake client
        RedisClient._instance = None
        client = RedisClient()
        yield client
        # Clean up
        RedisClient._instance = None

@pytest.mark.asyncio
async def test_cache_service_set_get(mock_redis):
    cache = CacheService()

    # Test set/get with dictionary
    data = {"a": 1, "b": "test"}
    success = await cache.set("test_key", data)
    assert success is True

    val = await cache.get("test_key")
    assert val == data

@pytest.mark.asyncio
async def test_cache_service_miss(mock_redis):
    cache = CacheService()
    val = await cache.get("non_existent")
    assert val is None

@pytest.mark.asyncio
async def test_cache_service_delete(mock_redis):
    cache = CacheService()
    await cache.set("to_delete", "value")

    success = await cache.delete("to_delete")
    assert success is True

    val = await cache.get("to_delete")
    assert val is None

# --- CoreVerificationService Tests ---

@pytest.mark.asyncio
async def test_core_verification_service_cache_hit():
    # Mock the CacheService entirely
    mock_cache = AsyncMock(spec=CacheService)
    # Simulate cache hit
    mock_cache.get.return_value = {"verdict": "CACHED", "confidence": 1.0, "evidence": []}

    service = CoreVerificationService()
    service.cache = mock_cache

    result = await service.verify_claim("some claim")

    assert result["verdict"] == "CACHED"
    mock_cache.get.assert_called_once()
    # Should not set cache on hit
    mock_cache.set.assert_not_called()

@pytest.mark.asyncio
async def test_core_verification_service_cache_miss():
    mock_cache = AsyncMock(spec=CacheService)
    # Simulate cache miss
    mock_cache.get.return_value = None

    service = CoreVerificationService()
    service.cache = mock_cache

    # Mock vector search if it were used, currently just initialized

    result = await service.verify_claim("new claim")

    # Default implementation returns TRUE
    assert result["verdict"] == "TRUE"
    mock_cache.get.assert_called_once()
    # Should set cache on miss
    mock_cache.set.assert_called_once()
