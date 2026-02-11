import pytest
from fastapi.testclient import TestClient
from summit.main import app

def test_factmarkets_health():
    with TestClient(app) as client:
        response = client.get("/api/factmarkets/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy", "product": "factmarkets"}
