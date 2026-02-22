import sys
from unittest.mock import MagicMock

# Mock missing modules
sys.modules["spacy"] = MagicMock()
sys.modules["neo4j"] = MagicMock()
sys.modules["neo4j.exceptions"] = MagicMock()
sys.modules["opentelemetry"] = MagicMock()
sys.modules["opentelemetry.exporter"] = MagicMock()
sys.modules["opentelemetry.exporter.otlp"] = MagicMock()
sys.modules["opentelemetry.exporter.otlp.proto"] = MagicMock()
sys.modules["opentelemetry.exporter.otlp.proto.grpc"] = MagicMock()
sys.modules["opentelemetry.exporter.otlp.proto.grpc.trace_exporter"] = MagicMock()
sys.modules["opentelemetry.instrumentation"] = MagicMock()
sys.modules["opentelemetry.instrumentation.fastapi"] = MagicMock()
sys.modules["opentelemetry.sdk"] = MagicMock()
sys.modules["opentelemetry.sdk.resources"] = MagicMock()
sys.modules["opentelemetry.sdk.trace"] = MagicMock()
sys.modules["opentelemetry.sdk.trace.export"] = MagicMock()
sys.modules["sentence_transformers"] = MagicMock()
sys.modules["intelgraph_ai_ml"] = MagicMock()
sys.modules["intelgraph_ai_ml.graph_forecaster"] = MagicMock()

import pytest
from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)

def test_factgov_workflow():
    # 1. Create Vendor
    vendor_data = {
        "company_name": "Test Vendor",
        "products": [
            {
                "product_id": "prod_123",
                "name": "FactFlow",
                "category": "verification",
                "description": "Verifies news",
                "use_cases": ["news"],
                "integrations": ["slack"]
            }
        ],
        "certifications": [],
        "cooperative_memberships": [],
        "compliance_docs": {},
        "pricing": {
            "model_type": "subscription",
            "base_price": 100.0,
            "currency": "USD"
        }
    }

    response = client.post("/api/factgov/vendors", json=vendor_data)
    assert response.status_code == 200
    vendor = response.json()
    assert vendor["company_name"] == "Test Vendor"
    assert "vendor_id" in vendor
    vendor_id = vendor["vendor_id"]

    # 2. Search Vendors
    response = client.get(f"/api/factgov/vendors/search?query=factflow")
    assert response.status_code == 200
    results = response.json()
    assert len(results) >= 1
    assert results[0]["vendor_id"] == vendor_id

    # 3. Match RFP
    rfp_data = {
        "rfp_text": "Need news verification tool",
        "agency_id": "agency_123"
    }
    response = client.post("/api/factgov/rfps/match", json=rfp_data)
    assert response.status_code == 200
    matches = response.json()
    assert len(matches) >= 1
    assert matches[0]["vendor"]["vendor_id"] == vendor_id
    assert "fit_score" in matches[0]

    # 4. Initiate Contract
    contract_req = {
        "agency_id": "agency_123",
        "vendor_id": vendor_id,
        "product_id": "prod_123",
        "contract_value": 10000.0
    }
    response = client.post("/api/factgov/contracts/initiate", json=contract_req)
    assert response.status_code == 200
    contract = response.json()
    assert contract["agency_id"] == "agency_123"
    assert contract["status"] == "active"
    assert contract["contract_value"] == 10000.0
    assert contract["platform_fee"] == 1200.0
