from fastapi.testclient import TestClient

from ml.app.main import api


def test_health():
    c = TestClient(api)
    assert c.get("/health").json()["status"] == "ok"
