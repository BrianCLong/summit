import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock
from summit.main import app
from summit.services.shared.core_verification import CoreVerificationService

client = TestClient(app)

# --- FactFlow Tests ---

def test_factflow_health():
    response = client.get("/api/factflow/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "product": "factflow"}

def test_factflow_verify_live_transcript():
    mock_service = AsyncMock(spec=CoreVerificationService)
    mock_service.verify_claim.return_value = {
        "verdict": "TRUE",
        "confidence": 0.95,
        "evidence": ["e1", "e2"]
    }

    # Dependency override
    app.dependency_overrides[CoreVerificationService] = lambda: mock_service

    try:
        response = client.post(
            "/api/factflow/verify-live-transcript",
            params={"transcript": "Test claim"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["claim"] == "Test claim"
        assert data["verdict"] == "TRUE"
        assert data["confidence"] == 0.95
        assert data["evidence"] == ["e1", "e2"]
    finally:
        # Clean up override
        app.dependency_overrides = {}

# --- FactLaw Tests ---

def test_factlaw_health():
    response = client.get("/api/factlaw/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "product": "factlaw"}

# --- FactMarkets Tests ---

def test_factmarkets_health():
    response = client.get("/api/factmarkets/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "product": "factmarkets"}

# --- FactGov Tests ---

def test_factgov_health():
    response = client.get("/api/factgov/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "product": "factgov"}

# --- Root Test ---

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "products" in response.json()
    products = response.json()["products"]
    assert "factflow" in products
    assert "factlaw" in products
