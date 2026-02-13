import pytest
import json
from fastapi.testclient import TestClient
from summit.main import app
import fakeredis
from unittest.mock import patch
from summit.cache.redis_client import RedisClient
from summit.services.cache import CacheService

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_redis_client_singleton():
    RedisClient._instance = None
    yield
    RedisClient._instance = None

def test_factflow_verification_integration_with_cache():
    # Patch redis.Redis.from_url to verify full integration
    fake_redis = fakeredis.FakeRedis(decode_responses=True)

    # We need to ensure RedisClient uses this fake redis
    with patch("redis.Redis.from_url", return_value=fake_redis):

        # 1. Initial request (Cache miss -> compute -> cache)
        response = client.post(
            "/api/factflow/verify-live-transcript",
            params={"transcript": "Integration Test Claim"}
        )
        assert response.status_code == 200
        data = response.json()

        # Verify default behavior (TRUE, 0.85)
        assert data["verdict"] == "TRUE"
        assert data["confidence"] == 0.85

        # Verify it was written to Redis
        keys = fake_redis.keys("verify:factflow:*")
        assert len(keys) == 1
        key = keys[0]

        cached_val = fake_redis.get(key)
        cached_json = json.loads(cached_val)
        assert cached_json["verdict"] == "TRUE"

        # 2. Modify cache to prove cache hit on subsequent request
        cached_json["verdict"] = "FALSE"
        fake_redis.set(key, json.dumps(cached_json))

        # 3. Subsequent request (Cache hit)
        response_cached = client.post(
            "/api/factflow/verify-live-transcript",
            params={"transcript": "Integration Test Claim"}
        )
        assert response_cached.status_code == 200
        data_cached = response_cached.json()

        # Should return FALSE from cache
        assert data_cached["verdict"] == "FALSE"
