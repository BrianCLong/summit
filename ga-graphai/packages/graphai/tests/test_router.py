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



def test_federated_plan_endpoint():
    response = client.post(
        "/federation/plan",
        json={
            "nodes": [
                {
                    "node_id": "edge-us",
                    "locality": "us-east",
                    "privacy_budget": 1.5,
                    "sensitivity_ceiling": 3,
                    "latency_penalty_ms": 40,
                    "supported_capabilities": ["entity-resolution", "multimodal"],
                    "sovereign": False,
                },
                {
                    "node_id": "ally-eu",
                    "locality": "eu-central",
                    "privacy_budget": 3.0,
                    "sensitivity_ceiling": 5,
                    "latency_penalty_ms": 55,
                    "supported_capabilities": ["entity-resolution", "narrative-forensics"],
                    "sovereign": True,
                },
            ],
            "query": {
                "query_id": "q-123",
                "required_capabilities": ["entity-resolution", "narrative-forensics"],
                "sensitivity": 3,
                "preferred_localities": ["eu-central"],
                "privacy_budget": 2.5,
                "estimated_edges": 50000,
            },
        },
    )
    body = response.json()
    assert response.status_code == 200
    assert body["query_id"] == "q-123"
    assert len(body["steps"]) == 2
    assert body["steps"][0]["node_id"] in {"ally-eu", "edge-us"}



def test_narrative_analysis_endpoint():
    response = client.post(
        "/narratives/analyse",
        json={
            "observations": [
                {
                    "identification": 0.8,
                    "imitation": 0.6,
                    "amplification": 0.7,
                    "emotional_triggers": {"fear": 0.4, "hope": 0.2},
                },
                {
                    "identification": 0.7,
                    "imitation": 0.65,
                    "amplification": 0.75,
                    "emotional_triggers": {"fear": 0.3, "anger": 0.1},
                },
            ]
        },
    )
    body = response.json()
    assert response.status_code == 200
    assert 0 <= body["sentiment_risk"] <= 1
    assert body["volatility"] >= 0



def test_distribution_shift_endpoint():
    response = client.post(
        "/analytics/distribution-shift",
        json={
            "baseline": [0.2, 0.3, 0.5],
            "observed": [0.25, 0.25, 0.5],
            "threshold": 0.05,
        },
    )
    body = response.json()
    assert response.status_code == 200
    assert body["divergence"] >= 0
    assert isinstance(body["breached"], bool)



def test_diffusion_endpoint():
    response = client.post(
        "/analytics/diffusion",
        json={
            "nodes": ["a", "b", "c"],
            "edges": [["a", "b"], ["b", "c"]],
            "iterations": 5,
        },
    )
    body = response.json()
    assert response.status_code == 200
    assert abs(sum(body["weights"].values()) - 1) < 1e-6



def test_gfm_benchmark_endpoint():
    response = client.post(
        "/gfm/benchmark",
        json={
            "model": "iohunter",
            "embedding_dim": 512,
            "latency_ms": 120,
            "max_nodes": 200000,
            "specialties": ["influence-detection"],
            "baseline": [
                {"precision": 0.8, "recall": 0.7, "f1": 0.75, "roc_auc": 0.78},
                {"precision": 0.79, "recall": 0.72, "f1": 0.75, "roc_auc": 0.8},
            ],
            "candidate": [
                {"precision": 0.85, "recall": 0.78, "f1": 0.81, "roc_auc": 0.85},
                {"precision": 0.84, "recall": 0.79, "f1": 0.81, "roc_auc": 0.86},
            ],
        },
    )
    body = response.json()
    assert response.status_code == 200
    assert body["lift_precision"] > 0
    assert body["candidate"]["precision"] >= 0.84

def test_federated_plan_endpoint():
    response = client.post(
        "/federation/plan",
        json={
            "nodes": [
                {
                    "node_id": "edge-us",
                    "locality": "us-east",
                    "privacy_budget": 1.5,
                    "sensitivity_ceiling": 3,
                    "latency_penalty_ms": 40,
                    "supported_capabilities": [
                        "entity-resolution",
                        "multimodal",
                    ],
                    "sovereign": False,
                },
                {
                    "node_id": "ally-eu",
                    "locality": "eu-central",
                    "privacy_budget": 3.0,
                    "sensitivity_ceiling": 5,
                    "latency_penalty_ms": 55,
                    "supported_capabilities": [
                        "entity-resolution",
                        "narrative-forensics",
                    ],
                    "sovereign": True,
                },
            ],
            "query": {
                "query_id": "q-123",
                "required_capabilities": [
                    "entity-resolution",
                    "narrative-forensics",
                ],
                "sensitivity": 3,
                "preferred_localities": ["eu-central"],
                "privacy_budget": 2.5,
                "estimated_edges": 50000,
            },
        },
    )
    body = response.json()
    assert response.status_code == 200
    assert body["query_id"] == "q-123"
    assert len(body["steps"]) == 2
    assert body["steps"][0]["node_id"] in {"ally-eu", "edge-us"}


def test_narrative_analysis_endpoint():
    response = client.post(
        "/narratives/analyse",
        json={
            "observations": [
                {
                    "identification": 0.8,
                    "imitation": 0.6,
                    "amplification": 0.7,
                    "emotional_triggers": {"fear": 0.4, "hope": 0.2},
                },
                {
                    "identification": 0.7,
                    "imitation": 0.65,
                    "amplification": 0.75,
                    "emotional_triggers": {"fear": 0.3, "anger": 0.1},
                },
            ]
        },
    )
    body = response.json()
    assert response.status_code == 200
    assert 0 <= body["sentiment_risk"] <= 1
    assert body["volatility"] >= 0


def test_distribution_shift_endpoint():
    response = client.post(
        "/analytics/distribution-shift",
        json={
            "baseline": [0.2, 0.3, 0.5],
            "observed": [0.25, 0.25, 0.5],
            "threshold": 0.05,
        },
    )
    body = response.json()
    assert response.status_code == 200
    assert body["divergence"] >= 0
    assert isinstance(body["breached"], bool)


def test_diffusion_endpoint():
    response = client.post(
        "/analytics/diffusion",
        json={
            "nodes": ["a", "b", "c"],
            "edges": [["a", "b"], ["b", "c"]],
            "iterations": 5,
        },
    )
    body = response.json()
    assert response.status_code == 200
    assert abs(sum(body["weights"].values()) - 1) < 1e-6


def test_gfm_benchmark_endpoint():
    response = client.post(
        "/gfm/benchmark",
        json={
            "model": "iohunter",
            "embedding_dim": 512,
            "latency_ms": 120,
            "max_nodes": 200000,
            "specialties": ["influence-detection"],
            "baseline": [
                {"precision": 0.8, "recall": 0.7, "f1": 0.75, "roc_auc": 0.78},
                {"precision": 0.79, "recall": 0.72, "f1": 0.75, "roc_auc": 0.8},
            ],
            "candidate": [
                {"precision": 0.85, "recall": 0.78, "f1": 0.81, "roc_auc": 0.85},
                {"precision": 0.84, "recall": 0.79, "f1": 0.81, "roc_auc": 0.86},
            ],
        },
    )
    body = response.json()
    assert response.status_code == 200
    assert body["lift_precision"] > 0
    assert body["candidate"]["precision"] >= 0.84
