import pathlib
import sys

from fastapi.testclient import TestClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))
from main import app  # type: ignore

client = TestClient(app)


def test_route_model_success():
    response = client.post(
        "/router/route",
        json={
            "action": "chat",
            "tenant_id": "tenant-1",
            "user_id": "user-1",
            "required_capabilities": ["analysis"],
            "region": "us-east-1",
            "max_latency_ms": 500,
            "max_cost_per_1k_tokens": 40.0,
        },
    )
    body = response.json()
    assert response.status_code == 200
    assert body["model"] == "atlas-gpt-4"
    assert "Selected" in body["reason"]


def test_route_model_guardrail_failure():
    response = client.post(
        "/router/route",
        json={
            "action": "chat",
            "tenant_id": "tenant-1",
            "user_id": "user-1",
            "required_capabilities": ["analysis"],
            "region": "us-east-1",
            "max_latency_ms": 100,
            "max_cost_per_1k_tokens": 5.0,
        },
    )
    assert response.status_code == 422
    assert "No model satisfies" in response.json()["detail"]
