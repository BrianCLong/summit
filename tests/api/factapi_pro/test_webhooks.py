from fastapi.testclient import TestClient
from api.factapi_pro.main import app
from unittest.mock import patch
import os
import time
import hmac
import hashlib
import json

client = TestClient(app)

@patch.dict(os.environ, {"FACTAPI_PRO_ENABLED": "true", "FACTAPI_PRO_VALID_KEYS": "valid-key"})
def test_async_verify():
    response = client.post(
        "/v1/verify/async",
        json={"claim": "Test claim"},
        headers={"X-API-Key": "valid-key"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data
    assert data["status"] == "queued"

@patch.dict(os.environ, {"FACTAPI_PRO_WEBHOOK_SECRET": "test-secret"})
def test_webhook_inbound_success():
    secret = b"test-secret"
    payload = json.dumps({"event": "payment_success"}).encode()
    timestamp = str(int(time.time()))

    signature = hmac.new(secret, payload, hashlib.sha256).hexdigest()

    response = client.post(
        "/v1/webhooks/inbound",
        content=payload,
        headers={
            "X-Hub-Signature": f"sha256={signature}",
            "X-Timestamp": timestamp
        }
    )
    assert response.status_code == 200
    assert response.json()["status"] == "received"

@patch.dict(os.environ, {"FACTAPI_PRO_WEBHOOK_SECRET": "test-secret"})
def test_webhook_inbound_invalid_signature():
    payload = json.dumps({"event": "payment_success"}).encode()
    timestamp = str(int(time.time()))

    response = client.post(
        "/v1/webhooks/inbound",
        content=payload,
        headers={
            "X-Hub-Signature": "sha256=invalid",
            "X-Timestamp": timestamp
        }
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid signature"

@patch.dict(os.environ, {"FACTAPI_PRO_WEBHOOK_SECRET": "test-secret"})
def test_webhook_inbound_stale_timestamp():
    payload = json.dumps({"event": "payment_success"}).encode()
    # 10 minutes ago
    timestamp = str(int(time.time()) - 600)

    # Signature is valid for the payload, but timestamp is checked first or independently?
    # Our implementation checks timestamp first.

    secret = b"test-secret"
    signature = hmac.new(secret, payload, hashlib.sha256).hexdigest()

    response = client.post(
        "/v1/webhooks/inbound",
        content=payload,
        headers={
            "X-Hub-Signature": f"sha256={signature}",
            "X-Timestamp": timestamp
        }
    )
    assert response.status_code == 400
    assert "Timestamp out of bounds" in response.json()["detail"]
