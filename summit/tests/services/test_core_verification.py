import pytest
from unittest.mock import AsyncMock, patch
from summit.services.shared.core_verification import CoreVerificationService

@pytest.mark.asyncio
async def test_verify_claim_cache_hit():
    with patch('summit.services.shared.core_verification.CacheService') as MockCache, \
         patch('summit.services.shared.core_verification.VectorSearch') as MockVector:

        mock_cache_instance = MockCache.return_value
        mock_cache_instance.get = AsyncMock(return_value={"verdict": "CACHED"})

        service = CoreVerificationService()
        result = await service.verify_claim("test claim")

        assert result == {"verdict": "CACHED"}
        mock_cache_instance.get.assert_called_once()

@pytest.mark.asyncio
async def test_verify_claim_cache_miss():
    with patch('summit.services.shared.core_verification.CacheService') as MockCache, \
         patch('summit.services.shared.core_verification.VectorSearch') as MockVector:

        mock_cache_instance = MockCache.return_value
        mock_cache_instance.get = AsyncMock(return_value=None)
        mock_cache_instance.set = AsyncMock()

        service = CoreVerificationService()
        result = await service.verify_claim("test claim")

        assert result["verdict"] == "TRUE"
        assert result["confidence"] == 0.85

        mock_cache_instance.get.assert_called_once()
        mock_cache_instance.set.assert_called_once()
