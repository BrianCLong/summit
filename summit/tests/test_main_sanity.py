from fastapi.testclient import TestClient
from summit.main import app

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert "products" in response.json()
    assert "factflow" in response.json()["products"]
    assert "factgov" in response.json()["products"]

def test_health_check_implied():
    # Since / returns 200, the app is up.
    # We can also check if docs are accessible (standard FastAPI feature)
    response = client.get("/docs")
    assert response.status_code == 200
