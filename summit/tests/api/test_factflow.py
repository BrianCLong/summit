import pytest
from fastapi.testclient import TestClient
from summit.main import app
from summit.services.shared.core_verification import CoreVerificationService

# Mock for CoreVerificationService
class MockCoreVerificationService:
    async def verify_claim(self, claim, product="generic", context=None):
        return {
            "verdict": "TRUE",
            "confidence": 0.99,
            "evidence": ["mock evidence"],
            "product": product
        }

@pytest.fixture
def client():
    # Override dependency
    app.dependency_overrides[CoreVerificationService] = MockCoreVerificationService
    with TestClient(app) as c:
        yield c
    # Clean up
    app.dependency_overrides.clear()

def test_factflow_health(client):
    response = client.get("/api/factflow/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "product": "factflow"}

def test_verify_live_transcript(client):
    response = client.post("/api/factflow/verify-live-transcript", params={"transcript": "test claim"})
    assert response.status_code == 200
    data = response.json()
    assert data["claim"] == "test claim"
    assert data["verdict"] == "TRUE"
    assert data["confidence"] == 0.99
    assert data["evidence"] == ["mock evidence"]
