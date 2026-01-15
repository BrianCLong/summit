from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health():
    assert client.get("/healthz").json()["ok"] is True


def test_claim_201():
    response = client.post("/claim", json={"evidenceId": "ev_123", "assertion": "ok"})
    assert response.status_code == 201
    body = response.json()
    assert body["evidenceId"] == "ev_123" and body["hash"].startswith("sha256:")
