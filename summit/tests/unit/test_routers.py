from fastapi.testclient import TestClient
from summit.main import app
from summit.services.shared.core_verification import CoreVerificationService
from unittest.mock import AsyncMock
import pytest

client = TestClient(app)

@pytest.fixture
def override_verification_service():
    mock_service = AsyncMock(spec=CoreVerificationService)
    mock_service.verify_claim.return_value = {
        "verdict": "FALSE",
        "confidence": 0.95,
        "evidence": ["Evidence 1"],
        "reasoning": "Mocked reasoning"
    }
    app.dependency_overrides[CoreVerificationService] = lambda: mock_service
    yield mock_service
    app.dependency_overrides = {}

def test_factflow_verify_live_transcript(override_verification_service):
    response = client.post("/api/factflow/verify-live-transcript", params={"transcript": "test claim"})
    assert response.status_code == 200
    data = response.json()
    assert data["claim"] == "test claim"
    assert data["verdict"] == "FALSE"
    assert data["confidence"] == 0.95

def test_factflow_health():
    response = client.get("/api/factflow/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "product": "factflow"}

def test_factlaw_health():
    response = client.get("/api/factlaw/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "product": "factlaw"}

def test_factmarkets_health():
    response = client.get("/api/factmarkets/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "product": "factmarkets"}

def test_factgov_health():
    response = client.get("/api/factgov/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "product": "factgov"}

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "factflow" in response.json()["products"]
