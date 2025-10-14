import pathlib
import sys

from fastapi.testclient import TestClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))
from autonomous_investigator.main import app  # type: ignore

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_plan_generation_contains_patent_advantages():
    payload = {
        "case_id": "case-42",
        "objectives": [
            {
                "description": "Disrupt fraudulent payment mule network",
                "priority": 1,
                "success_metric": "Block >95% mule payouts",
            },
            {
                "description": "Map command-and-control infrastructure",
                "priority": 2,
                "success_metric": "Identify 3+ control nodes",
            },
        ],
        "leads": [
            {
                "id": "lead-a",
                "description": "Coordinated withdrawals from clustered ATMs",
                "signal_type": "transactional",
                "severity": 0.8,
                "confidence": 0.7,
            },
            {
                "id": "lead-b",
                "description": "Shared device fingerprints across merchant accounts",
                "signal_type": "device",
                "severity": 0.75,
                "confidence": 0.65,
            },
            {
                "id": "lead-c",
                "description": "Anomalous logins from low-reputation ASN",
                "signal_type": "network",
                "severity": 0.6,
                "confidence": 0.8,
            },
        ],
        "resources": ["fusion-team", "llm-cohort"],
        "risk_appetite": 0.6,
    }
    response = client.post("/investigator/plan", json=payload)
    assert response.status_code == 200
    body = response.json()

    assert body["case_id"] == "case-42"
    assert len(body["hypotheses"]) >= 3
    assert any("Triangulated hypothesis graph" in factor for factor in body["differentiation_factors"])
    assert body["assurance_score"] >= 0.65

    first_task = body["tasks"][0]
    assert "innovation_vectors" in first_task
    assert "triangulated-hypothesis-graph" in first_task["innovation_vectors"]
