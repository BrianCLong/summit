import pathlib
import sys

from fastapi.testclient import TestClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))
from main import app  # noqa: E402


client = TestClient(app)


def test_secure_degree_query_returns_deterministic_noise():
    edges = [["a", "b"], ["b", "c"], ["c", "d"], ["d", "a"]]
    payload = {
        "edges": edges,
        "targets": ["a", "c"],
        "epsilon": 0.5,
        "sensitivity": 1.0,
        "seed": 7,
    }

    response = client.post("/query/privacy/degree", json=payload)
    response_repeat = client.post("/query/privacy/degree", json=payload)
    body = response.json()

    assert response.status_code == 200
    assert response.json() == response_repeat.json()
    assert body["metadata"]["epsilon"] == payload["epsilon"]
    assert body["metadata"]["noise_scale"] == payload["sensitivity"] / payload["epsilon"]
    assert body["metadata"]["audit_proof"].startswith("zkp_sha256_")


def test_secure_degree_query_rejects_invalid_privacy_budget():
    payload = {
        "edges": [["x", "y"]],
        "epsilon": 0,
    }

    response = client.post("/query/privacy/degree", json=payload)

    assert response.status_code == 422
    assert "epsilon" in response.json()["detail"].lower()
