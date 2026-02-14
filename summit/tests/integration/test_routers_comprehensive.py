import pytest
from summit.services.cache import CacheService
from summit.services.shared.core_verification import CoreVerificationService

def test_health_endpoints(client):
    endpoints = [
        "/api/factflow/health",
        "/api/factgov/health",
        "/api/factlaw/health",
        "/api/factmarkets/health"
    ]
    for endpoint in endpoints:
        response = client.get(endpoint)
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_factflow_verify_live_transcript_integration(client, mock_redis):
    # This test runs with the real CoreVerificationService (mocked Redis via autouse fixture)

    transcript = "The sky is blue."
    endpoint = "/api/factflow/verify-live-transcript"

    # First call: should process and cache
    response = client.post(endpoint, params={"transcript": transcript})
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "TRUE"
    assert data["confidence"] == 0.85
    assert data["claim"] == transcript

    # Check cache was populated (implementation detail check)
    cache = CacheService()
    # Key format: verify:{product}:{hash(claim)}
    # But hash() in python is not stable across processes/runs usually, but here it is same run.
    # However, verify:factflow:hash(claim)
    # Let's just check if ANY key exists with prefix
    keys = mock_redis.keys("verify:factflow:*")
    assert len(keys) > 0

    # Second call: should hit cache
    # We can verify cache hit by changing the cache value manually
    key = keys[0]
    cached_value = {
        "verdict": "FALSE", # Changed to verify cache hit
        "confidence": 0.1,
        "evidence": [],
        "reasoning": "cached override"
    }
    await cache.set(key, cached_value)

    response2 = client.post(endpoint, params={"transcript": transcript})
    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["verdict"] == "FALSE"
    # Router does not return reasoning
    # assert data2["reasoning"] == "cached override"
    assert data2["confidence"] == 0.1
