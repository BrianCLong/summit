import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from summit.services.shared.core_verification import CoreVerificationService

@pytest.fixture
def mock_cache():
    return AsyncMock()

@pytest.fixture
def mock_vector_search():
    return MagicMock()

@pytest.fixture
def service(mock_cache, mock_vector_search):
    with patch('summit.services.shared.core_verification.CacheService', return_value=mock_cache), \
         patch('summit.services.shared.core_verification.VectorSearch', return_value=mock_vector_search):
        return CoreVerificationService()

@pytest.mark.asyncio
async def test_verify_claim_cache_miss(service, mock_cache):
    mock_cache.get.return_value = None
    mock_cache.set = AsyncMock()

    result = await service.verify_claim("test claim", product="test_product")

    assert result["verdict"] == "TRUE"
    mock_cache.get.assert_called_once()
    mock_cache.set.assert_called_once()

@pytest.mark.asyncio
async def test_verify_claim_cache_hit(service, mock_cache):
    cached_result = {"verdict": "FALSE", "confidence": 0.9}
    mock_cache.get.return_value = cached_result

    result = await service.verify_claim("test claim", product="test_product")

    assert result == cached_result
    mock_cache.get.assert_called_once()
    mock_cache.set.assert_not_called()
