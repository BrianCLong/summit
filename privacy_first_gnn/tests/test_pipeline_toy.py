import json
from pathlib import Path

import pytest

from privacy_first_gnn.he.api import HEInterface
from privacy_first_gnn.he.mock_backend import MockHEBackend
from privacy_first_gnn.pipeline.infer import run_inference
from privacy_first_gnn.pipeline.ingest import ingest_telemetry


@pytest.fixture
def policy():
    policy_path = Path(__file__).parent.parent / "policy" / "sensitive_fields.json"
    with open(policy_path) as f:
        return json.load(f)

def test_pipeline_toy_success(policy):
    he = HEInterface(MockHEBackend())

    # Mock data from edge
    topology = {
        "nodes": ["node-01", "node-02"],
        "edges": [{"src": "node-01", "dst": "node-02", "bucket": 100}]
    }

    # Edge encrypts features
    raw_features = {"node-01": "normal-traffic", "node-02": "high-cpu"}
    payloads = {k: he.encrypt(v, "MOCK_PUBLIC_PARAMS") for k, v in raw_features.items()}

    encrypted_features = {
        "payloads": payloads,
        "classification": "SENSITIVE_ENCRYPTED"
    }

    # 1. Ingest (on server)
    ingested = ingest_telemetry(topology, encrypted_features, policy)

    # 2. Infer (on server)
    cipher_score = run_inference(ingested, he)

    assert cipher_score.startswith("SCORE:")
    assert "CIPHER:normal-traffic" in cipher_score

    # 3. Decrypt (back on edge)
    final_result = he.decrypt(cipher_score, "MOCK_SECRET_KEY")
    assert final_result.startswith("DECIDED:")

def test_pipeline_toy_ingest_fail(policy):
    topology = {
        "nodes": ["node-01"],
        "edges": [{"src": "node-01", "dst": "node-02", "bucket": 1, "src_ip": "1.2.3.4"}]
    }
    encrypted_features = {"payloads": {}, "classification": "SENSITIVE_ENCRYPTED"}

    with pytest.raises(ValueError, match="Sensitive field 'src_ip' found in plaintext"):
        ingest_telemetry(topology, encrypted_features, policy)
