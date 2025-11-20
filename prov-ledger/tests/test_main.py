import json
import pytest
from fastapi.testclient import TestClient
from prov.model import ProvDocument
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding

from service.main import app, _private_keys, _public_keys, SignedProvDocument

client = TestClient(app)

@pytest.fixture
def test_doc():
    doc = ProvDocument()
    doc.add_namespace("ex", "http://example.org/")
    doc.entity("ex:e1")
    return doc

def test_register_namespace(test_doc):
    response = client.post("/namespace", json={"prefix": "ex", "uri": "http://example.org/"})
    assert response.status_code == 200
    assert response.json() == {"message": "Namespace registered"}

    # Test duplicate registration
    response = client.post("/namespace", json={"prefix": "ex", "uri": "http://example.org/"})
    assert response.status_code == 409

def test_submit_and_get_document(test_doc):
    doc_json = json.loads(test_doc.serialize(format='json'))
    message = json.dumps(doc_json, sort_keys=True).encode('utf-8')

    private_key = _private_keys["default_key"]
    signature = private_key.sign(
        message,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH
        ),
        hashes.SHA256()
    )

    signed_doc = SignedProvDocument(document=doc_json, signature=signature.hex())

    # Submit
    response = client.post("/documents/test_doc_1", json=signed_doc.model_dump())
    assert response.status_code == 200
    assert response.json() == {"message": "Document submitted and verified successfully"}

    # Test duplicate submission
    response = client.post("/documents/test_doc_1", json=signed_doc.model_dump())
    assert response.status_code == 409

    # Get
    response = client.get("/documents/test_doc_1")
    assert response.status_code == 200
    retrieved_doc = SignedProvDocument(**response.json())
    assert retrieved_doc.document == doc_json
    assert retrieved_doc.signature == signature.hex()

def test_verify_document(test_doc):
    doc_json = json.loads(test_doc.serialize(format='json'))
    message = json.dumps(doc_json, sort_keys=True).encode('utf-8')

    private_key = _private_keys["default_key"]
    signature = private_key.sign(
        message,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH
        ),
        hashes.SHA256()
    )

    signed_doc = SignedProvDocument(document=doc_json, signature=signature.hex())
    client.post("/documents/test_doc_2", json=signed_doc.model_dump())

    # Verify
    response = client.post("/documents/verify/test_doc_2")
    assert response.status_code == 200
    assert response.json() == {"verified": True}

def test_verify_tampered_document(test_doc):
    doc_json = json.loads(test_doc.serialize(format='json'))
    message = json.dumps(doc_json, sort_keys=True).encode('utf-8')

    private_key = _private_keys["default_key"]
    signature = private_key.sign(
        message,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH
        ),
        hashes.SHA256()
    )

    # Tamper with the document
    doc_json_tampered = doc_json.copy()
    doc_json_tampered["entity"]["ex:e1"]["prov:label"] = "tampered"

    signed_doc = SignedProvDocument(document=doc_json_tampered, signature=signature.hex())

    response = client.post("/documents/test_doc_tampered", json=signed_doc.model_dump())
    assert response.status_code == 400
    assert response.json() == {"detail": "Invalid signature"}

def test_migrate_green_lock_ledger():
    csv_data = "10041,codex/implement-tamper-proof-provenance-graph,BrianCLong,2025-10-04T17:00:39Z,feat: launch global provenance graph"
    response = client.post(
        "/migrate/green-lock-ledger",
        files={"file": ("green_lock_ledger.csv", csv_data, "text/csv")}
    )
    assert response.status_code == 200
    assert response.json() == {"message": "Migrated 1 records from green-lock-ledger"}
