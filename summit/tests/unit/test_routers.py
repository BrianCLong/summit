import pytest
from fastapi.testclient import TestClient
from summit.main import app
from summit.services.shared.core_verification import CoreVerificationService
from unittest.mock import AsyncMock

client = TestClient(app)

def test_health_endpoints():
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
async def test_verify_live_transcript_mocked():
    # Mock CoreVerificationService
    mock_service = AsyncMock()
    mock_service.verify_claim.return_value = {
        "verdict": "TRUE",
        "confidence": 0.99,
        "evidence": ["mock evidence"],
        "reasoning": "mock reasoning"
    }

    # Override dependency
    app.dependency_overrides[CoreVerificationService] = lambda: mock_service

    try:
        response = client.post(
            "/api/factflow/verify-live-transcript",
            params={"transcript": "Some claim"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["verdict"] == "TRUE"
        assert data["confidence"] == 0.99
        assert data["evidence"] == ["mock evidence"]
    finally:
        # Reset override
        app.dependency_overrides = {}
