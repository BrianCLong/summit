import pytest
from unittest.mock import AsyncMock
from summit.services.shared.core_verification import CoreVerificationService

@pytest.mark.asyncio
async def test_verify_claim_cache_hit():
    service = CoreVerificationService()
    service.cache.get = AsyncMock(return_value={"cached": "result"})

    result = await service.verify_claim("test claim", product="factflow")
    assert result == {"cached": "result"}
    service.cache.get.assert_called_once()

@pytest.mark.asyncio
async def test_verify_claim_cache_miss():
    service = CoreVerificationService()
    service.cache.get = AsyncMock(return_value=None)
    service.cache.set = AsyncMock()

    result = await service.verify_claim("test claim", product="factflow")

    assert result["verdict"] == "TRUE"
    service.cache.get.assert_called_once()
    service.cache.set.assert_called_once()
