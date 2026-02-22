from fastapi.testclient import TestClient
from summit.main import app

def test_read_root():
    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        assert isinstance(data["products"], list)
        expected_products = ["factflow", "factlaw", "factmarkets", "factgov"]
        for product in expected_products:
            assert product in data["products"]
