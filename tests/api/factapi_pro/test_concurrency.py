from fastapi.testclient import TestClient
from api.factapi_pro.main import app
from unittest.mock import patch
import os

client = TestClient(app)

@patch.dict(os.environ, {"FACTAPI_PRO_ENABLED": "true", "FACTAPI_PRO_VALID_KEYS": "valid-key"})
def test_concurrency_rejection():
    # We simulate a state where queue is full.

    from api.factapi_pro.concurrency.guard import concurrency_guard, TenantConcurrency
    from api.factapi_pro.storage.memory_store import store

    # Pre-populate tenant guard with full queue
    tenant_id = store.get_tenant_id("valid-key")

    # Set queue limit to 0, so any usage (queue_count >= 0) triggers 429
    guard = TenantConcurrency(limit=1, queue_limit=0)
    guard.queue_count = 0

    concurrency_guard.tenants[tenant_id] = guard

    response = client.post(
        "/v1/verify",
        json={"claim": "Test claim"},
        headers={"X-API-Key": "valid-key"}
    )
    assert response.status_code == 429
    assert response.json()["detail"] == "Concurrency queue limit exceeded"
    assert response.headers["Retry-After"] == "10"

    # Clean up
    del concurrency_guard.tenants[tenant_id]
