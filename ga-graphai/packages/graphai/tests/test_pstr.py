import pathlib
import sys

from fastapi.testclient import TestClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))
from main import app

client = TestClient(app)


def _base_payload():
    return {
        "query": "trusted alpha document",
        "purpose": "analysis",
        "top_k": 2,
        "user_ctx": {
            "user_id": "analyst-1",
            "roles": ["analyst"],
            "tenant": "demo",
            "clearances": ["public", "restricted"],
            "attributes": {},
        },
        "budgets": {"max_hops": 2, "max_expansions": 50, "seed_k": 5},
        "determinism": {"seed": 7},
    }


def test_pstr_skips_forbidden_nodes():
    payload = _base_payload()
    payload["nodes"] = [
        {
            "id": "allowed",
            "text": "trusted alpha document",
            "sensitivity_labels": ["public"],
            "provenance": {"trust": 0.9},
        },
        {"id": "forbidden", "text": "secret alpha", "sensitivity_labels": ["forbidden"]},
    ]
    payload["edges"] = []

    response = client.post("/retrieval/pstr", json=payload)
    assert response.status_code == 200
    programs = response.json()["evidence_programs"]
    assert programs
    all_nodes = {node for program in programs for node in program["evidence_paths"][0]["nodes"]}
    assert "forbidden" not in all_nodes


def test_pstr_applies_redaction_for_missing_clearance():
    payload = _base_payload()
    payload["user_ctx"]["clearances"] = ["public"]
    payload["nodes"] = [
        {
            "id": "sensitive",
            "text": "trusted alpha",
            "sensitivity_labels": ["restricted"],
            "provenance": {"trust": 0.6},
        },
    ]
    payload["edges"] = []

    response = client.post("/retrieval/pstr", json=payload)
    assert response.status_code == 200
    program = response.json()["evidence_programs"][0]
    assert any(redaction["target_id"] == "sensitive" for redaction in program["redactions"])


def test_pstr_prefers_higher_trust_paths():
    payload = _base_payload()
    payload["nodes"] = [
        {
            "id": "high-trust",
            "text": "trusted alpha",
            "sensitivity_labels": ["public"],
            "provenance": {"trust": 0.95},
        },
        {
            "id": "low-trust",
            "text": "trusted alpha",
            "sensitivity_labels": ["public"],
            "provenance": {"trust": 0.2},
        },
    ]
    payload["edges"] = []

    response = client.post("/retrieval/pstr", json=payload)
    assert response.status_code == 200
    program = response.json()["evidence_programs"][0]
    assert program["evidence_paths"][0]["nodes"][0] == "high-trust"


def test_pstr_tracks_cache_hits_for_duplicate_edges():
    payload = _base_payload()
    payload["query"] = "beta"
    payload["nodes"] = [
        {
            "id": "seed",
            "label": "seed node",
            "sensitivity_labels": ["public"],
            "provenance": {"trust": 0.4},
        },
        {
            "id": "beta",
            "text": "beta node",
            "sensitivity_labels": ["public"],
            "provenance": {"trust": 0.7},
        },
    ]
    payload["edges"] = [
        {
            "source": "seed",
            "target": "beta",
            "rel_type": "mentions",
            "sensitivity_labels": ["public"],
            "provenance": {"trust": 0.6},
        },
        {
            "source": "seed",
            "target": "beta",
            "rel_type": "mentions",
            "sensitivity_labels": ["public"],
            "provenance": {"trust": 0.6},
        },
    ]
    payload["budgets"] = {
        "max_hops": 2,
        "max_expansions": 10,
        "seed_k": 2,
        "rel_whitelist": ["mentions"],
    }

    response = client.post("/retrieval/pstr", json=payload)
    assert response.status_code == 200
    telemetry = response.json()["telemetry"]
    assert telemetry["cache_hits"] >= 1
    program = response.json()["evidence_programs"][0]
    assert "beta" in program["evidence_paths"][0]["nodes"]
