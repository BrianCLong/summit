"""Test FastAPI endpoints."""

import json

import pytest
from fastapi.testclient import TestClient

from core.models import Claim, Decision, Entity, Source


def test_root_endpoint(client: TestClient):
    """Test root endpoint returns API info."""
    response = client.get("/")
    assert response.status_code == 200

    data = response.json()
    assert data["name"] == "IntelGraph API"
    assert "endpoints" in data


def test_health_endpoint(client: TestClient):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


# Entity endpoint tests


def test_create_entity(client: TestClient):
    """Test creating an entity via API."""
    response = client.post(
        "/entities",
        json={"type": "person", "labels": '["analyst", "verified"]'},
    )

    assert response.status_code == 201
    data = response.json()

    assert data["id"] is not None
    assert data["type"] == "person"
    assert data["labels"] == '["analyst", "verified"]'
    assert "created_at" in data
    assert "updated_at" in data


def test_list_entities(client: TestClient, sample_entity: Entity):
    """Test listing entities."""
    response = client.get("/entities")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_list_entities_pagination(client: TestClient, test_db):
    """Test entity list pagination."""
    # Create multiple entities
    for i in range(5):
        entity = Entity(type=f"type_{i}", labels="[]")
        test_db.create_entity(entity)

    # Get first page
    response = client.get("/entities?limit=2&offset=0")
    assert response.status_code == 200
    page1 = response.json()
    assert len(page1) == 2

    # Get second page
    response = client.get("/entities?limit=2&offset=2")
    assert response.status_code == 200
    page2 = response.json()
    assert len(page2) == 2

    # Ensure pages are different
    assert page1[0]["id"] != page2[0]["id"]


def test_get_entity(client: TestClient, sample_entity: Entity):
    """Test getting entity by ID."""
    response = client.get(f"/entities/{sample_entity.id}")
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == sample_entity.id
    assert data["type"] == sample_entity.type


def test_get_entity_not_found(client: TestClient):
    """Test getting non-existent entity returns 404."""
    response = client.get("/entities/9999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


# Claim endpoint tests


def test_create_claim(client: TestClient, sample_entity: Entity):
    """Test creating a claim via API."""
    response = client.post(
        "/claims",
        json={
            "entity_id": sample_entity.id,
            "predicate": "works_at",
            "value": "Topicality",
            "source_ids": "[1, 2]",
            "policy_labels": '{"origin": "public", "sensitivity": "low", "legal_basis": "consent"}',
        },
    )

    assert response.status_code == 201
    data = response.json()

    assert data["id"] is not None
    assert data["entity_id"] == sample_entity.id
    assert data["predicate"] == "works_at"
    assert data["value"] == "Topicality"
    assert "created_at" in data


def test_create_claim_invalid_entity(client: TestClient):
    """Test creating claim with non-existent entity fails."""
    response = client.post(
        "/claims",
        json={
            "entity_id": 9999,
            "predicate": "test",
            "value": "test",
        },
    )

    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_list_claims(client: TestClient, sample_claim: Claim):
    """Test listing claims."""
    response = client.get("/claims")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


# Decision endpoint tests


def test_create_decision(client: TestClient):
    """Test creating a decision via API."""
    decision_data = {
        "title": "Expand to EU market",
        "context": "Market research complete, legal review done",
        "options": '["Expand now", "Wait 6 months", "Skip"]',
        "decision": "Expand now",
        "reversible_flag": True,
        "owners": '["CEO", "CFO", "Head of EU"]',
        "checks": '["Legal compliance", "Budget approved", "Team ready"]',
        "related_claim_ids": "[1, 2, 3]",
    }

    response = client.post("/decisions", json=decision_data)
    assert response.status_code == 201

    data = response.json()
    assert data["id"] is not None
    assert data["title"] == "Expand to EU market"
    assert data["decision"] == "Expand now"
    assert data["reversible_flag"] is True
    assert "created_at" in data


def test_list_decisions(client: TestClient, sample_decision: Decision):
    """Test listing decisions."""
    response = client.get("/decisions")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_get_decision(client: TestClient, sample_decision: Decision):
    """Test getting decision by ID."""
    response = client.get(f"/decisions/{sample_decision.id}")
    assert response.status_code == 200

    data = response.json()
    assert data["id"] == sample_decision.id
    assert data["title"] == sample_decision.title


def test_get_decision_not_found(client: TestClient):
    """Test getting non-existent decision returns 404."""
    response = client.get("/decisions/9999")
    assert response.status_code == 404


# Source endpoint tests


def test_create_source(client: TestClient):
    """Test creating a source via API."""
    response = client.post(
        "/sources",
        json={
            "uri_or_hash": "ipfs://QmHash123",
            "origin": "confidential",
            "sensitivity": "high",
            "legal_basis": "legitimate_interests",
        },
    )

    assert response.status_code == 201
    data = response.json()

    assert data["id"] is not None
    assert data["uri_or_hash"] == "ipfs://QmHash123"
    assert data["origin"] == "confidential"
    assert data["sensitivity"] == "high"
    assert "ingested_at" in data


def test_list_sources(client: TestClient, sample_source: Source):
    """Test listing sources."""
    response = client.get("/sources")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


# Entity context endpoint tests


def test_get_entity_context(
    client: TestClient,
    sample_entity: Entity,
    sample_claim: Claim,
    sample_decision: Decision,
):
    """Test getting complete entity context (happy path)."""
    response = client.get(f"/entities/{sample_entity.id}/context")
    assert response.status_code == 200

    data = response.json()

    # Verify entity is included
    assert data["entity"]["id"] == sample_entity.id

    # Verify claims are included
    assert "claims" in data
    assert len(data["claims"]) >= 1
    assert data["claims"][0]["entity_id"] == sample_entity.id

    # Verify related decisions are included
    assert "decisions" in data
    # Decision should be included because it references the claim
    decision_ids = [d["id"] for d in data["decisions"]]
    assert sample_decision.id in decision_ids


def test_get_entity_context_no_claims(client: TestClient, sample_entity: Entity):
    """Test getting context for entity with no claims."""
    response = client.get(f"/entities/{sample_entity.id}/context")
    assert response.status_code == 200

    data = response.json()
    assert data["entity"]["id"] == sample_entity.id
    assert data["claims"] == []
    assert data["decisions"] == []


def test_get_entity_context_not_found(client: TestClient):
    """Test getting context for non-existent entity."""
    response = client.get("/entities/9999/context")
    assert response.status_code == 404


def test_entity_context_filters_unrelated_decisions(
    client: TestClient, test_db, sample_entity: Entity, sample_claim: Claim
):
    """Test that entity context only returns related decisions."""
    # Create another entity and claim
    other_entity = Entity(type="other", labels="[]")
    other_entity = test_db.create_entity(other_entity)

    other_claim = Claim(
        entity_id=other_entity.id,
        predicate="test",
        value="value",
    )
    other_claim = test_db.create_claim(other_claim)

    # Create decision related to other_claim
    other_decision = Decision(
        title="Other Decision",
        context="Unrelated",
        decision="Do something else",
        related_claim_ids=f"[{other_claim.id}]",
    )
    test_db.create_decision(other_decision)

    # Get context for sample_entity
    response = client.get(f"/entities/{sample_entity.id}/context")
    assert response.status_code == 200

    data = response.json()

    # Verify the other decision is NOT included
    decision_ids = [d["id"] for d in data["decisions"]]
    assert other_decision.id not in decision_ids


def test_create_decision_ceo_template_example(client: TestClient):
    """
    Test creating a decision following the CEO decision template.

    This validates the mapping:
    - Context -> context field
    - Options -> options array
    - Decision -> decision field
    - Reversible? -> reversible_flag
    - Risks -> checks array (risks are part of checks)
    - Owners -> owners array
    - Checks -> checks array
    """
    ceo_decision = {
        "title": "Hire VP of Engineering",
        "context": (
            "Team has grown to 25 engineers. Need technical leadership. "
            "3 candidates interviewed, all qualified. Salary band: $200-250k."
        ),
        "options": json.dumps(
            [
                "Hire Candidate A (strong distributed systems, 10y exp)",
                "Hire Candidate B (ML focus, 8y exp, startup background)",
                "Delay hire, promote from within",
            ]
        ),
        "decision": "Hire Candidate A",
        "reversible_flag": True,  # Can course-correct during probation
        "owners": json.dumps(["CEO", "CTO", "Head of HR"]),
        "checks": json.dumps(
            [
                "Risk: Candidate might not fit culture (mitigation: 3-month probation)",
                "Risk: High comp could create equity issues (mitigation: review comp bands)",
                "Check: Reference checks complete",
                "Check: Background check passed",
                "Check: Offer letter reviewed by legal",
            ]
        ),
        "related_claim_ids": json.dumps([]),  # No claims in this example
    }

    response = client.post("/decisions", json=ceo_decision)
    assert response.status_code == 201

    data = response.json()
    assert data["title"] == "Hire VP of Engineering"
    assert data["reversible_flag"] is True
    assert "CEO" in json.loads(data["owners"])
    assert len(json.loads(data["options"])) == 3
    assert len(json.loads(data["checks"])) == 5
