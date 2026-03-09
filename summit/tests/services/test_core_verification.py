import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from summit.services.shared.core_verification import CoreVerificationService
from summit.services.cache import CacheService

@pytest.fixture
def mock_cache():
    return AsyncMock(spec=CacheService)

@pytest.fixture
def service(mock_cache):
    # We patch CacheService class to return our mock instance
    with patch("summit.services.shared.core_verification.CacheService", return_value=mock_cache):
        # When CoreVerificationService instantiates CacheService(), it gets our mock
        svc = CoreVerificationService()
        # Since we patched the class, svc.cache should be our mock_cache if correctly implemented
        # But verify just in case
        svc.cache = mock_cache
        return svc

@pytest.mark.asyncio
async def test_verify_claim_cache_hit(service, mock_cache):
    claim = "test_claim"
    expected_result = {
        "verdict": "TRUE",
        "confidence": 0.99,
        "evidence": ["cached"],
        "reasoning": "cached"
    }

    # Mock cache hit (AsyncMock automatically returns awaitable)
    mock_cache.get.return_value = expected_result

    result = await service.verify_claim(claim)

    assert result == expected_result
    # Ensure cache was checked
    mock_cache.get.assert_called_once()
    # Ensure cache was not set
    mock_cache.set.assert_not_called()

@pytest.mark.asyncio
async def test_verify_claim_cache_miss(service, mock_cache):
    claim = "test_claim_miss"

    # Mock cache miss
    mock_cache.get.return_value = None

    # Mock cache set to return True
    mock_cache.set.return_value = True

    result = await service.verify_claim(claim)

    # The current implementation returns a placeholder
    assert result["verdict"] == "TRUE"
    assert result["confidence"] == 0.85

    # Ensure cache was checked
    mock_cache.get.assert_called_once()
    # Ensure result was cached
    mock_cache.set.assert_called_once()

    # Check arguments
    # call_args returns (args, kwargs)
    # verify_claim does: await self.cache.set(cache_key, result, ttl=3600)
    args, kwargs = mock_cache.set.call_args
    # args[0] is key, args[1] is result
    assert "verify:generic:" in args[0]
    assert args[1] == result
    assert kwargs.get('ttl') == 3600
