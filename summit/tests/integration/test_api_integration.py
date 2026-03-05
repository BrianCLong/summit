import pytest
import os
import redis
from summit.flags import REDIS_CACHE_ENABLED

@pytest.mark.skipif(not REDIS_CACHE_ENABLED, reason="Redis cache disabled")
def test_factflow_integration_with_redis(client):
    # Check if redis is reachable, otherwise skip
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379")
    try:
        r = redis.Redis.from_url(redis_url, socket_connect_timeout=1)
        r.ping()
    except redis.ConnectionError:
        pytest.skip("Redis not available")

    # Clear cache for test key if possible, or just rely on unique input
    unique_claim = "integration test claim " + os.urandom(4).hex()

    response = client.post("/api/factflow/verify-live-transcript", params={"transcript": unique_claim})
    assert response.status_code == 200
    data = response.json()
    assert data["claim"] == unique_claim
    assert "verdict" in data
    assert "confidence" in data

def test_health_endpoints_integration(client):
    products = ["factflow", "factlaw", "factmarkets", "factgov"]
    for product in products:
        response = client.get(f"/api/{product}/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy", "product": product}
