import pytest
from fastapi.testclient import TestClient
import os
from ..main import app
from ..platform_spine import flags

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_product_routers_disabled_by_default():
    # By default, MULTIPRODUCT_ENABLED is False
    products = ["factflow", "factlaw", "factmarkets", "factgov"]
    for product in products:
        response = client.get(f"/api/{product}/health")
        # Since the router is NOT included when flags.MULTIPRODUCT_ENABLED is False,
        # it should return 404 from FastAPI's main app.
        assert response.status_code == 404

def test_product_routers_enabled():
    # Mock flags to enable products
    from ..factflow.router import router as factflow_router
    from ..factlaw.router import router as factlaw_router
    from ..factmarkets.router import router as factmarkets_router
    from ..factgov.router import router as factgov_router

    app.include_router(factflow_router, prefix="/test_api")
    app.include_router(factlaw_router, prefix="/test_api")
    app.include_router(factmarkets_router, prefix="/test_api")
    app.include_router(factgov_router, prefix="/test_api")

    # Manually set flags to True for these tests
    flags.FACTFLOW_ENABLED = True
    flags.FACTLAW_ENABLED = True
    flags.FACTMARKETS_ENABLED = True
    flags.FACTGOV_ENABLED = True

    products = ["factflow", "factlaw", "factmarkets", "factgov"]
    for product in products:
        response = client.get(f"/test_api/{product}/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        assert response.json()["product"].lower() == product

def test_redaction_helper():
    from ..platform_spine.redaction import redact_text, redact_dict

    assert redact_text("api_key: secret123") == "api_key: [REDACTED]"
    assert redact_text("Authorization: Bearer mytoken") == "Authorization: [REDACTED]"

    data = {"api_key": "secret", "user": "jules"}
    redacted = redact_dict(data)
    assert redacted["api_key"] == "[REDACTED]"
    assert redacted["user"] == "jules"

def test_verification_facade():
    from ..platform_spine.verification_facade import verification_facade
    import asyncio

    result = asyncio.run(verification_facade.verify_claim("test claim"))
    assert "verdict" in result
    assert "Verified (Stub)" in result["verdict"]
