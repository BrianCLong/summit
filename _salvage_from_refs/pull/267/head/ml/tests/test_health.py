from app.main import api
from fastapi.testclient import TestClient

def test_health():
    c = TestClient(api)
    assert c.get("/health").json()["status"] == "ok"