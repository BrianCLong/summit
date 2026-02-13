import pytest
from summit.services.shared.core_verification import CoreVerificationService
from summit.main import app

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

def test_verify_live_transcript(client):
    # Mock the CoreVerificationService
    class MockVerificationService:
        async def verify_claim(self, claim, product="generic", context=None):
            return {
                "verdict": "TRUE",
                "confidence": 0.99,
                "evidence": ["mock evidence"],
                "reasoning": "mock reasoning"
            }

    app.dependency_overrides[CoreVerificationService] = MockVerificationService

    response = client.post(
        "/api/factflow/verify-live-transcript",
        params={"transcript": "Some claim"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "TRUE"
    assert data["confidence"] == 0.99

    # Clean up
    app.dependency_overrides = {}
