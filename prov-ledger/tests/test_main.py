from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pytest

from service.main import app
from service.database import Base
from service.crud import get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(scope="function", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def test_create_source():
    response = client.post("/sources/", json={"name": "Test Source", "url": "http://example.com"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Source"
    assert data["url"] == "http://example.com"
    assert "id" in data

def test_create_transform():
    response = client.post("/transforms/", json={"name": "Test Transform", "description": "A test transform"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Transform"
    assert data["description"] == "A test transform"
    assert "id" in data

def test_create_license():
    response = client.post("/licenses/", json={"name": "Test License", "url": "http://example.com/license"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test License"
    assert data["url"] == "http://example.com/license"
    assert "id" in data

def test_create_evidence():
    source_res = client.post("/sources/", json={"name": "Test Source"})
    transform_res = client.post("/transforms/", json={"name": "Test Transform"})
    license_res = client.post("/licenses/", json={"name": "Test License"})

def test_create_evidence_idempotent():
    source_res = client.post("/sources/", json={"name": "Test Source"})
    transform_res = client.post("/transforms/", json={"name": "Test Transform"})
    license_res = client.post("/licenses/", json={"name": "Test License"})

    source_id = source_res.json()["id"]
    transform_id = transform_res.json()["id"]
    license_id = license_res.json()["id"]

    evidence_data = {
        "content": "Test evidence content",
        "source_id": source_id,
        "transform_id": transform_id,
        "license_id": license_id
    }

    # Create the evidence for the first time
    response1 = client.post("/evidence/", json=evidence_data)
    assert response1.status_code == 201
    data1 = response1.json()

    # Try to create the same evidence again
    response2 = client.post("/evidence/", json=evidence_data)
    assert response2.status_code == 200
    data2 = response2.json()

    assert data1["id"] == data2["id"]

def test_link_claims():
    # Create two claims
    claim1_res = client.post("/claims/", json={"content": "Test claim 1", "evidence_ids": []})
    claim2_res = client.post("/claims/", json={"content": "Test claim 2", "evidence_ids": []})
    claim1_id = claim1_res.json()["id"]
    claim2_id = claim2_res.json()["id"]

    # Link claim1 to claim2
    response = client.post(f"/claims/{claim1_id}/link", json={"target_claim_id": claim2_id, "relationship_type": "supports"})
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == claim1_id

def test_get_evidence():
    # Create an evidence item
    source_res = client.post("/sources/", json={"name": "Test Source"})
    transform_res = client.post("/transforms/", json={"name": "Test Transform"})
    license_res = client.post("/licenses/", json={"name": "Test License"})
    source_id = source_res.json()["id"]
    transform_id = transform_res.json()["id"]
    license_id = license_res.json()["id"]
    evidence_res = client.post("/evidence/", json={
        "content": "Test evidence for get",
        "source_id": source_id,
        "transform_id": transform_id,
        "license_id": license_id
    })
    evidence_id = evidence_res.json()["id"]

    # Get the evidence item
    response = client.get(f"/evidence/{evidence_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == evidence_id
    assert data["content"] == "Test evidence for get"

def test_create_and_get_claim():
    source_res = client.post("/sources/", json={"name": "Test Source"})
    transform_res = client.post("/transforms/", json={"name": "Test Transform"})
    license_res = client.post("/licenses/", json={"name": "Test License"})

    source_id = source_res.json()["id"]
    transform_id = transform_res.json()["id"]
    license_id = license_res.json()["id"]

    evidence_res = client.post("/evidence/", json={
        "content": "Test evidence for claim",
        "source_id": source_id,
        "transform_id": transform_id,
        "license_id": license_id
    })
    evidence_id = evidence_res.json()["id"]

    claim_res = client.post("/claims/", json={"content": "Test claim", "evidence_ids": [evidence_id]})
    assert claim_res.status_code == 200
    claim_data = claim_res.json()
    assert claim_data["content"] == "Test claim"

    get_claim_res = client.get(f"/claims/{claim_data['id']}")
    assert get_claim_res.status_code == 200
    get_claim_data = get_claim_res.json()
    assert get_claim_data["content"] == "Test claim"

def test_create_disclosure_bundle():
    source_res = client.post("/sources/", json={"name": "Test Source"})
    transform_res = client.post("/transforms/", json={"name": "Test Transform"})
    license_res = client.post("/licenses/", json={"name": "Test License"})

    source_id = source_res.json()["id"]
    transform_id = transform_res.json()["id"]
    license_id = license_res.json()["id"]

    evidence1_res = client.post("/evidence/", json={
        "content": "Evidence 1", "source_id": source_id, "transform_id": transform_id, "license_id": license_id
    })
    evidence2_res = client.post("/evidence/", json={
        "content": "Evidence 2", "source_id": source_id, "transform_id": transform_id, "license_id": license_id
    })

    evidence1_id = evidence1_res.json()["id"]
    evidence2_id = evidence2_res.json()["id"]

    response = client.post("/disclosures/", json={"evidence_ids": [evidence1_id, evidence2_id]})
    assert response.status_code == 200
    data = response.json()
    assert "merkle_root" in data
    assert data["evidence_ids"] == [evidence1_id, evidence2_id]
