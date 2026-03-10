from unittest.mock import AsyncMock, patch

import pytest

from summit.services.shared.core_verification import CoreVerificationService


@pytest.mark.asyncio
async def test_verify_claim_cache_hit(core_verification_service):
    # Setup cache hit
    expected_result = {
        "verdict": "TRUE",
        "confidence": 0.9,
        "evidence": [],
        "reasoning": "Cached result"
    }
    core_verification_service.cache.get.return_value = expected_result

    result = await core_verification_service.verify_claim("some claim", product="test")

    assert result == expected_result
    core_verification_service.cache.get.assert_called_once()
    # Cache set should not be called if hit
    core_verification_service.cache.set.assert_not_called()

@pytest.mark.asyncio
async def test_verify_claim_cache_miss(core_verification_service):
    # Setup cache miss
    core_verification_service.cache.get.return_value = None

    result = await core_verification_service.verify_claim("some claim", product="test")

    # Assertions on the default mock behavior
    assert result["verdict"] == "TRUE"
    assert result["confidence"] == 0.85

    core_verification_service.cache.get.assert_called_once()
    core_verification_service.cache.set.assert_called_once()
