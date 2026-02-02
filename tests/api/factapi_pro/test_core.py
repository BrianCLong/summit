from fastapi.testclient import TestClient
from api.factapi_pro.main import app
from unittest.mock import patch
import os
import pytest

client = TestClient(app)

# Helper to override config behavior since it reads env vars at runtime (properties)
# However, if app.docs_url is set at import time, we can't easily change it without reloading.
# But for /v1/verify endpoint, it checks config.FACTAPI_PRO_ENABLED inside the function.

def test_health_check_defaults():
    # Default is disabled (from code), but we mocked it?
    # Actually, config.py reads os.getenv("FACTAPI_PRO_ENABLED", "false")
    # So default is false.
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["enabled"] is False

def test_verify_disabled_by_default():
    response = client.post(
        "/v1/verify",
        json={"claim": "Test claim"},
        headers={"X-API-Key": "test-key-123"}
    )
    assert response.status_code == 503
    assert "disabled" in response.json()["detail"]

@patch.dict(os.environ, {"FACTAPI_PRO_ENABLED": "true", "FACTAPI_PRO_VALID_KEYS": "valid-key"})
def test_verify_enabled_success():
    # We need to ensure config reads the new env var.
    # Since config properties are dynamic (computed properties), patch.dict works.

    response = client.post(
        "/v1/verify",
        json={"claim": "Test claim"},
        headers={"X-API-Key": "valid-key"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["verified"] is True
    assert data["score"] == 0.95

@patch.dict(os.environ, {"FACTAPI_PRO_ENABLED": "true", "FACTAPI_PRO_VALID_KEYS": "valid-key"})
def test_verify_auth_failure_missing_header():
    response = client.post(
        "/v1/verify",
        json={"claim": "Test claim"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Missing API Key"

@patch.dict(os.environ, {"FACTAPI_PRO_ENABLED": "true", "FACTAPI_PRO_VALID_KEYS": "valid-key"})
def test_verify_auth_failure_invalid_key():
    response = client.post(
        "/v1/verify",
        json={"claim": "Test claim"},
        headers={"X-API-Key": "invalid-key"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid API Key"
