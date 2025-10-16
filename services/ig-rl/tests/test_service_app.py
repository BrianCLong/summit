import pytest
from fastapi.testclient import TestClient
from ig_rl.clients.policy import PolicyClient
from ig_rl.config import ServiceConfig
from ig_rl.provenance.logger import ProvenanceLogger
from ig_rl.service.app import create_app


class InMemoryPublisher:
    def __init__(self) -> None:
        self.records = []

    async def publish(self, record) -> None:
        self.records.append(record)


@pytest.fixture
def test_app():
    publisher = InMemoryPublisher()
    logger = ProvenanceLogger(publisher)
    config = ServiceConfig()
    policy_client = PolicyClient(endpoint="http://example.com")
    app = create_app(config, policy_client=policy_client, provenance_logger=logger)
    return TestClient(app), publisher


def test_register_reward_endpoint(test_app):
    client, _ = test_app
    response = client.post(
        "/register_reward",
        json={
            "env": "graph_coa",
            "name": "coa",
            "kpi_weights": {"time_to_insight": 0.7, "accuracy": 0.3},
        },
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_advice_endpoint_records_provenance(test_app):
    client, publisher = test_app
    response = client.post(
        "/advice",
        json={
            "env": "graph_coa",
            "state": [0.1, 0.2, 0.3],
            "candidate_actions": ["next_best_action", "request_more_context"],
            "case_id": "case-1",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["action"] in {"next_best_action", "request_more_context"}
    assert body["explanation_ref"]
    assert publisher.records, "Provenance record should be stored"

    decision_id = body["explanation_ref"]
    explain_response = client.get(f"/explain/{decision_id}")
    assert explain_response.status_code == 200
    payload = explain_response.json()
    assert payload["decision_id"] == decision_id


def test_train_endpoint_returns_job(test_app):
    client, _ = test_app
    response = client.post("/train", json={"env": "graph_coa"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "completed"
