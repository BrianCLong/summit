import pathlib
import sys

from fastapi.testclient import TestClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))
from main import app  # type: ignore

client = TestClient(app)


def test_federated_attribution_flow():
    payload = {
        "snapshots": [
            {
                "domain_id": "finance",
                "classification": "confidential",
                "sensitivity_tier": 4,
                "controls": ["gdpr", "sox"],
                "behaviors": [
                    {
                        "actor_id": "actor-a",
                        "target_id": "ops-terminal",
                        "action": "export",
                        "timestamp": 1,
                        "risk": 0.82,
                        "privacy_tags": ["pii:ssn"],
                        "domain_id": "finance",
                    },
                    {
                        "actor_id": "actor-a",
                        "target_id": "ledger-1",
                        "action": "share",
                        "timestamp": 2,
                        "risk": 0.65,
                        "privacy_tags": ["pii:financial"],
                        "domain_id": "finance",
                    },
                ],
            },
            {
                "domain_id": "operations",
                "classification": "restricted",
                "sensitivity_tier": 3,
                "controls": ["nispom"],
                "behaviors": [
                    {
                        "actor_id": "actor-a",
                        "target_id": "ops-terminal",
                        "action": "login",
                        "timestamp": 3,
                        "risk": 0.78,
                        "privacy_tags": ["pii:geo"],
                        "domain_id": "operations",
                    },
                    {
                        "actor_id": "analyst-b",
                        "target_id": "ops-terminal",
                        "action": "audit",
                        "timestamp": 4,
                        "risk": 0.45,
                        "privacy_tags": [],
                        "domain_id": "operations",
                    },
                ],
            },
        ]
    }

    federate = client.post("/attribution/federate", json=payload)
    assert federate.status_code == 200
    summary = federate.json()
    assert summary["total_entities"] >= 4
    assert summary["cross_domain_links"], "Expected cross domain links"
    assert summary["cross_domain_links"][0]["source"] == "actor-a"
    assert 0 <= summary["pamag_score"] <= 1

    analysis = client.get("/attribution/analysis")
    assert analysis.status_code == 200
    body = analysis.json()
    assert body["tradeoff"]["tradeoff_index"] > 0
    assert body["model_design"]["name"] == "Privacy Adaptive Multi-layer Attribution Graph"
    assert any(scenario["actor"] == "actor-a" for scenario in body["threat_scenarios"])

    explanation = client.post("/attribution/explain", json={"entity_id": "actor-a"})
    assert explanation.status_code == 200
    exp_body = explanation.json()
    assert set(exp_body["domains"]) == {"finance", "operations"}
    assert exp_body["supporting_links"], "Expected supporting links for explanation"
    assert exp_body["residual_risk"] >= 0
