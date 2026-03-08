import pytest
from fastapi.testclient import TestClient

# Fixture to provide client for all tests in this file
@pytest.fixture
def client():
    from summit.main import app
    return TestClient(app)

def test_root_endpoint(client):
    """Test the root endpoint returns product list."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "products" in data
    assert "factflow" in data["products"]

def test_factflow_health(client):
    """Test FactFlow health endpoint."""
    response = client.get("/api/factflow/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "product": "factflow"}

def test_factlaw_health(client):
    """Test FactLaw health endpoint."""
    response = client.get("/api/factlaw/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "product": "factlaw"}

def test_factmarkets_health(client):
    """Test FactMarkets health endpoint."""
    response = client.get("/api/factmarkets/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "product": "factmarkets"}

def test_factgov_health(client):
    """Test FactGov health endpoint."""
    response = client.get("/api/factgov/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "product": "factgov"}

def test_verify_live_transcript(client):
    """Test FactFlow live transcript verification with mocked service."""
    from summit.main import app
    from summit.services.shared.core_verification import CoreVerificationService

    # Mock the CoreVerificationService to avoid external calls
    class MockVerificationService:
        async def verify_claim(self, claim, product="generic", context=None):
            return {
                "verdict": "TRUE",
                "confidence": 0.95,
                "evidence": ["Evidence A", "Evidence B"]
            }

    # Override the dependency
    app.dependency_overrides[CoreVerificationService] = MockVerificationService

    response = client.post(
        "/api/factflow/verify-live-transcript",
        params={"transcript": "The sky is blue"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["claim"] == "The sky is blue"
    assert data["verdict"] == "TRUE"
    assert data["confidence"] == 0.95
    assert len(data["evidence"]) == 2

    # Clean up override
    app.dependency_overrides = {}
