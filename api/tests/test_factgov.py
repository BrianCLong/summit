import sys
from unittest.mock import MagicMock

# Mock heavy dependencies
sys.modules["neo4j"] = MagicMock()
sys.modules["neo4j.exceptions"] = MagicMock()
sys.modules["spacy"] = MagicMock()
sys.modules["opentelemetry"] = MagicMock()
sys.modules["opentelemetry.exporter.otlp.proto.grpc.trace_exporter"] = MagicMock()
sys.modules["opentelemetry.instrumentation.fastapi"] = MagicMock()
sys.modules["opentelemetry.sdk.resources"] = MagicMock()
sys.modules["opentelemetry.sdk.trace"] = MagicMock()
sys.modules["opentelemetry.sdk.trace.export"] = MagicMock()
sys.modules["sentence_transformers"] = MagicMock()
sys.modules["intelgraph_ai_ml.graph_forecaster"] = MagicMock()

# Mock internal modules if they are problematic
# sys.modules["api.llm_provider"] = MagicMock() # We need this one actually, or mock it carefully

from fastapi.testclient import TestClient
from uuid import uuid4

# Import app AFTER mocking
from api.main import app

client = TestClient(app)

def test_factgov_flow():
    # 1. Register Vendor
    vendor_payload = {
        "company_name": "Test AI Vendor",
        "products": [
            {
                "product_id": "prod-1",
                "name": "Deepfake Detector 9000",
                "category": "deepfake_detection",
                "description": "Best deepfake detection in the world.",
                "use_cases": ["fraud"],
                "integrations": ["API"]
            }
        ],
        "certifications": [],
        "cooperative_memberships": ["TXShare"],
        "compliance_docs": {"SOC2": "http://example.com/soc2"}
    }

    response = client.post("/api/factgov/vendors", json=vendor_payload)
    if response.status_code != 200:
        print(response.json())
    assert response.status_code == 200
    vendor_data = response.json()
    vendor_id = vendor_data["vendor_id"]
    assert vendor_data["company_name"] == "Test AI Vendor"

    # 2. Search Vendors
    response = client.get("/api/factgov/vendors/search?query=Deepfake")
    assert response.status_code == 200
    results = response.json()
    assert len(results) > 0
    assert results[0]["vendor_id"] == vendor_id

    # 3. Match RFP
    rfp_payload = {
        "rfp_description": "We need deepfake detection for fraud prevention.",
        "budget": 500000.0,
        "agency_id": str(uuid4())
    }
    response = client.post("/api/factgov/rfps/match", json=rfp_payload)
    assert response.status_code == 200
    matches = response.json()
    assert len(matches) > 0
    assert matches[0]["vendor"]["vendor_id"] == vendor_id

    # 4. Initiate Contract
    contract_payload = {
        "agency_id": rfp_payload["agency_id"],
        "vendor_id": vendor_id,
        "product_id": "prod-1",
        "contract_value": 100000.0
    }
    response = client.post("/api/factgov/contracts/initiate", json=contract_payload)
    if response.status_code != 200:
        print(response.json())
    assert response.status_code == 200
    contract_data = response.json()
    assert contract_data["contract_value"] == 100000.0
    assert contract_data["platform_fee"] == 12000.0
