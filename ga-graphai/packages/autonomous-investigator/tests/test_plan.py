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
    assert any(
        "Triangulated hypothesis graph" in factor for factor in body["differentiation_factors"]
    )
    assert body["assurance_score"] >= 0.65

    first_task = body["tasks"][0]
    assert "innovation_vectors" in first_task
    assert "triangulated-hypothesis-graph" in first_task["innovation_vectors"]


def test_correlation_report_builds_cross_domain_chains():
    payload = {
        "case_id": "case-77",
        "objectives": [
            {
                "description": "Contain coordinated fraud and intrusion campaign",
                "priority": 1,
                "success_metric": "Break kill chain across finance and cyber",
            }
        ],
        "leads": [
            {
                "id": "osint-1",
                "description": "Forum chatter about new mule recruitment",
                "signal_type": "social",
                "severity": 0.62,
                "confidence": 0.71,
                "domain": "osint",
            },
            {
                "id": "fin-1",
                "description": "Linked bank transfers across high-risk accounts",
                "signal_type": "transactional",
                "severity": 0.83,
                "confidence": 0.78,
                "domain": "finintel",
            },
            {
                "id": "cyber-1",
                "description": "Command-and-control beacon from retail POS",
                "signal_type": "network",
                "severity": 0.74,
                "confidence": 0.69,
                "domain": "cyber",
            },
            {
                "id": "forensics-1",
                "description": "Disk artifact shows credential dumping tooling",
                "signal_type": "endpoint",
                "severity": 0.7,
                "confidence": 0.72,
                "domain": "forensics",
            },
        ],
        "resources": ["graph-analytics", "soar"],
        "risk_appetite": 0.55,
    }

    response = client.post("/investigator/correlation-report", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["case_id"] == "case-77"
    assert body["overall_confidence"] >= 0.65
    assert "cross-domain correlation" in body["summary"].lower()
    assert len(body["domain_correlations"]) >= 3
    assert body["evidence_chains"], "Evidence chains should not be empty"
    first_chain = body["evidence_chains"][0]
    assert first_chain["links"], "Evidence chain must include links"
    assert first_chain["strength"] > 0


def test_correlation_report_normalizes_domains_and_highlights_gaps():
    payload = {
        "case_id": "case-88",
        "objectives": [
            {
                "description": "Trace lateral movement between compromised tenants",
                "priority": 2,
                "success_metric": "Isolate shared indicators",
            }
        ],
        "leads": [
            {
                "id": "OSINT-Prime",
                "description": "Recruitment messages in multiple languages",
                "signal_type": "social",
                "severity": 0.58,
                "confidence": 0.63,
                "domain": "OSINT",
            },
            {
                "id": "CYBER-Core",
                "description": "DNS beaconing to dynamic domains",
                "signal_type": "network",
                "severity": 0.66,
                "confidence": 0.71,
                "domain": "CYBER",
            },
        ],
        "resources": ["graph-analytics"],
        "risk_appetite": 0.45,
    }

    response = client.post("/investigator/correlation-report", json=payload)

    assert response.status_code == 200
    body = response.json()
    domains = {entry["domain"] for entry in body["domain_correlations"]}
    # Domains should be normalized to lowercase
    assert domains == {"osint", "cyber"}
    assert "gaps:" in body["summary"].lower()
    assert body["overall_confidence"] < 0.75, "Confidence should account for coverage gaps"
