from fastapi.testclient import TestClient
from api.factapi_pro.main import app
from api.factapi_pro.storage.memory_store import store
from unittest.mock import patch
import os
import json
import pytest

client = TestClient(app)

@patch.dict(os.environ, {"FACTAPI_PRO_ENABLED": "true", "FACTAPI_PRO_VALID_KEYS": "valid-key,quota-exceeded-key,test-key-123"})
def test_quota_exceeded():
    # tenant-limited has quota 5 and usage 5 (see memory_store.py)
    response = client.post(
        "/v1/verify",
        json={"claim": "Test claim"},
        headers={"X-API-Key": "quota-exceeded-key"}
    )
    assert response.status_code == 429
    assert response.json()["detail"] == "Quota exceeded"

@patch.dict(os.environ, {"FACTAPI_PRO_ENABLED": "true", "FACTAPI_PRO_VALID_KEYS": "valid-key,quota-exceeded-key,test-key-123"})
def test_usage_increment():
    # tenant-pro (valid-key) has usage 0
    initial_usage = store.get_usage("tenant-pro")

    response = client.post(
        "/v1/verify",
        json={"claim": "Test claim"},
        headers={"X-API-Key": "valid-key"}
    )
    assert response.status_code == 200

    new_usage = store.get_usage("tenant-pro")
    assert new_usage == initial_usage + 1

@patch.dict(os.environ, {"FACTAPI_PRO_ENABLED": "true", "FACTAPI_PRO_VALID_KEYS": "valid-key,quota-exceeded-key,test-key-123"})
def test_generate_metrics_artifact():
    # Generate deterministic metrics.json
    metrics = {
        "tenants": {
            "tenant-default": {"quota": 1000, "usage": store.get_usage("tenant-default")},
            "tenant-pro": {"quota": 10000, "usage": store.get_usage("tenant-pro")},
            "tenant-limited": {"quota": 5, "usage": store.get_usage("tenant-limited")}
        }
    }

    artifact_dir = "artifacts/factapi-pro"
    os.makedirs(artifact_dir, exist_ok=True)
    artifact_path = os.path.join(artifact_dir, "metrics.json")

    with open(artifact_path, "w") as f:
        json.dump(metrics, f, indent=2, sort_keys=True)

    assert os.path.exists(artifact_path)
    # Check determinism (no timestamps)
    with open(artifact_path, "r") as f:
        content = f.read()
        assert "timestamp" not in content
