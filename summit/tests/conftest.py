from unittest.mock import patch

import fakeredis
import pytest
from fastapi.testclient import TestClient

from summit.cache.redis_client import RedisClient
from summit.main import app


@pytest.fixture(autouse=True)
def mock_redis():
    """Mock Redis globally for all tests."""
    server = fakeredis.FakeServer()
    mock_redis = fakeredis.FakeRedis(server=server, decode_responses=True)
    with patch("summit.cache.redis_client.redis.Redis.from_url", return_value=mock_redis):
        # Reset singleton to ensure it uses the mock
        RedisClient._instance = None
        yield mock_redis
        RedisClient._instance = None

@pytest.fixture
def client():
    return TestClient(app)
