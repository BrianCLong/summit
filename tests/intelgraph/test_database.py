"""Test database operations."""

import json

import pytest

from core.database import Database
from core.models import Claim, Decision, Entity, Source


def test_database_initialization(test_db: Database):
    """Test database initializes correctly."""
    assert test_db is not None
    assert test_db.engine is not None


def test_create_and_get_entity(test_db: Database):
    """Test round-trip entity creation and retrieval."""
    # Create entity
    entity = Entity(type="person", labels='["verified"]')
    created = test_db.create_entity(entity)

    assert created.id is not None
    assert created.type == "person"
    assert created.created_at is not None

    # Retrieve entity
    retrieved = test_db.get_entity(created.id)
    assert retrieved is not None
    assert retrieved.id == created.id
    assert retrieved.type == created.type


def test_list_entities(test_db: Database):
    """Test listing entities."""
    # Create multiple entities
    for i in range(5):
        entity = Entity(type=f"type_{i}", labels="[]")
        test_db.create_entity(entity)

    # List all
    entities = test_db.list_entities()
    assert len(entities) == 5

    # Test pagination
    page1 = test_db.list_entities(limit=2, offset=0)
    page2 = test_db.list_entities(limit=2, offset=2)

    assert len(page1) == 2
    assert len(page2) == 2
    assert page1[0].id != page2[0].id


def test_create_and_get_claim(test_db: Database, sample_entity: Entity):
    """Test round-trip claim creation and retrieval."""
    # Create claim
    claim = Claim(
        entity_id=sample_entity.id,
        predicate="works_at",
        value="Topicality",
        source_ids="[1]",
    )
    created = test_db.create_claim(claim)

    assert created.id is not None
    assert created.entity_id == sample_entity.id
    assert created.predicate == "works_at"


def test_get_claims_by_entity(test_db: Database, sample_entity: Entity):
    """Test fetching claims for a specific entity."""
    # Create another entity
    other_entity = Entity(type="org", labels="[]")
    other_entity = test_db.create_entity(other_entity)

    # Create claims for both entities
    claim1 = Claim(
        entity_id=sample_entity.id,
        predicate="name",
        value="Alice",
        source_ids="[1]",
    )
    claim2 = Claim(
        entity_id=sample_entity.id,
        predicate="role",
        value="Engineer",
        source_ids="[2]",
    )
    claim3 = Claim(
        entity_id=other_entity.id,
        predicate="name",
        value="ACME Corp",
        source_ids="[3]",
    )

    test_db.create_claim(claim1)
    test_db.create_claim(claim2)
    test_db.create_claim(claim3)

    # Get claims for sample_entity
    claims = test_db.get_claims_by_entity(sample_entity.id)

    assert len(claims) == 2
    assert all(c.entity_id == sample_entity.id for c in claims)


def test_create_and_get_decision(test_db: Database):
    """Test round-trip decision creation and retrieval."""
    # Create decision
    decision = Decision(
        title="Test Decision",
        context="Testing decisions",
        options='["A", "B"]',
        decision="A",
        reversible_flag=True,
        owners='["Alice"]',
        checks='["Review complete"]',
        related_claim_ids="[1, 2]",
    )
    created = test_db.create_decision(decision)

    assert created.id is not None
    assert created.title == "Test Decision"

    # Retrieve decision
    retrieved = test_db.get_decision(created.id)
    assert retrieved is not None
    assert retrieved.id == created.id
    assert retrieved.decision == "A"


def test_list_decisions(test_db: Database):
    """Test listing decisions."""
    # Create decisions
    for i in range(3):
        decision = Decision(
            title=f"Decision {i}",
            context="Testing",
            decision=f"Choice {i}",
        )
        test_db.create_decision(decision)

    # List all
    decisions = test_db.list_decisions()
    assert len(decisions) == 3


def test_create_and_get_source(test_db: Database):
    """Test round-trip source creation and retrieval."""
    # Create source
    source = Source(
        uri_or_hash="https://example.com/doc",
        origin="public",
        sensitivity="low",
        legal_basis="consent",
    )
    created = test_db.create_source(source)

    assert created.id is not None
    assert created.uri_or_hash == "https://example.com/doc"

    # Retrieve source
    retrieved = test_db.get_source(created.id)
    assert retrieved is not None
    assert retrieved.id == created.id


def test_list_sources(test_db: Database):
    """Test listing sources."""
    # Create sources
    for i in range(4):
        source = Source(uri_or_hash=f"https://example.com/doc{i}")
        test_db.create_source(source)

    # List all
    sources = test_db.list_sources()
    assert len(sources) == 4

    # Test pagination
    page1 = test_db.list_sources(limit=2)
    assert len(page1) == 2


def test_entity_not_found(test_db: Database):
    """Test getting non-existent entity returns None."""
    entity = test_db.get_entity(9999)
    assert entity is None


def test_decision_not_found(test_db: Database):
    """Test getting non-existent decision returns None."""
    decision = test_db.get_decision(9999)
    assert decision is None


def test_source_not_found(test_db: Database):
    """Test getting non-existent source returns None."""
    source = test_db.get_source(9999)
    assert source is None
