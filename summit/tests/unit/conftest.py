import pytest
from unittest.mock import MagicMock, AsyncMock
from summit.services.cache import CacheService
from summit.services.vector_search import VectorSearch
from summit.services.shared.core_verification import CoreVerificationService

@pytest.fixture
def mock_redis_client():
    mock = MagicMock()
    mock.get.return_value = None
    mock.set.return_value = True
    return mock

@pytest.fixture
def mock_cache_service(mock_redis_client):
    service = CacheService()
    service.redis = mock_redis_client
    # CacheService methods are async
    service.get = AsyncMock(return_value=None)
    service.set = AsyncMock(return_value=True)
    return service

@pytest.fixture
def mock_vector_search():
    return MagicMock(spec=VectorSearch)

@pytest.fixture
def core_verification_service(mock_cache_service, mock_vector_search):
    service = CoreVerificationService()
    service.cache = mock_cache_service
    service.vector_search = mock_vector_search
    return service
