from fastapi.testclient import TestClient
from summit.main import app
import pytest

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "products" in response.json()
