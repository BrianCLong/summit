import pytest
from unittest.mock import MagicMock, patch
from summit.services.cache import CacheService

@pytest.fixture
def mock_redis_client():
    with patch("summit.services.cache.RedisClient") as MockRedisClient:
        # Create a mock instance
        mock_instance = MagicMock()
        # Make the class return this instance when instantiated
        MockRedisClient.return_value = mock_instance
        yield mock_instance

@pytest.mark.asyncio
async def test_cache_service_get_hit(mock_redis_client):
    # Setup
    mock_redis_client.get.return_value = "cached_value"
    service = CacheService()

    # Execute
    result = await service.get("test_key")

    # Verify
    assert result == "cached_value"
    mock_redis_client.get.assert_called_once_with("test_key")

@pytest.mark.asyncio
async def test_cache_service_get_miss(mock_redis_client):
    # Setup
    mock_redis_client.get.return_value = None
    service = CacheService()

    # Execute
    result = await service.get("missing_key")

    # Verify
    assert result is None
    mock_redis_client.get.assert_called_once_with("missing_key")

@pytest.mark.asyncio
async def test_cache_service_set(mock_redis_client):
    # Setup
    mock_redis_client.set.return_value = True
    service = CacheService()

    # Execute
    result = await service.set("test_key", "value", ttl=60)

    # Verify
    assert result is True
    mock_redis_client.set.assert_called_once_with("test_key", "value", 60)

@pytest.mark.asyncio
async def test_cache_service_delete(mock_redis_client):
    # Setup
    mock_redis_client.delete.return_value = True
    service = CacheService()

    # Execute
    result = await service.delete("test_key")

    # Verify
    assert result is True
    mock_redis_client.delete.assert_called_once_with("test_key")
