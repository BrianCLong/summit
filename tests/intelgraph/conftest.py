"""Pytest fixtures for IntelGraph tests."""

import os
import sys
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

# Add intelgraph to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "intelgraph"))

from api import app  # noqa: E402
from core.database import Database, reset_database  # noqa: E402
from core.models import Claim, Decision, Entity, Source  # noqa: E402


@pytest.fixture(name="test_db")
def test_database() -> Generator[Database, None, None]:
    """
    Create a fresh in-memory database for each test.

    Yields:
        Database instance with clean tables
    """
    # Reset global DB instance
    reset_database()

    # Create in-memory database
    db = Database("sqlite:///:memory:")
    db.create_tables()

    yield db

    # Cleanup
    reset_database()


@pytest.fixture(name="session")
def session_fixture(test_db: Database) -> Generator[Session, None, None]:
    """
    Provide a database session for tests.

    Args:
        test_db: Test database fixture

    Yields:
        SQLModel session
    """
    with test_db.get_session() as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(test_db: Database) -> TestClient:
    """
    Create a test client for API testing.

    Args:
        test_db: Test database fixture

    Returns:
        FastAPI test client
    """
    # Override the app's database instance
    from core.database import get_database

    app.dependency_overrides[get_database] = lambda: test_db

    client = TestClient(app)
    return client


@pytest.fixture(name="sample_entity")
def sample_entity_fixture(test_db: Database) -> Entity:
    """
    Create a sample entity for testing.

    Args:
        test_db: Test database fixture

    Returns:
        Created entity
    """
    entity = Entity(type="person", labels='["test", "sample"]')
    return test_db.create_entity(entity)


@pytest.fixture(name="sample_source")
def sample_source_fixture(test_db: Database) -> Source:
    """
    Create a sample source for testing.

    Args:
        test_db: Test database fixture

    Returns:
        Created source
    """
    source = Source(
        uri_or_hash="https://example.com/doc1",
        origin="public",
        sensitivity="low",
        legal_basis="consent",
    )
    return test_db.create_source(source)


@pytest.fixture(name="sample_claim")
def sample_claim_fixture(test_db: Database, sample_entity: Entity) -> Claim:
    """
    Create a sample claim for testing.

    Args:
        test_db: Test database fixture
        sample_entity: Sample entity fixture

    Returns:
        Created claim
    """
    claim = Claim(
        entity_id=sample_entity.id,
        predicate="works_at",
        value="Topicality",
        source_ids="[1]",
        policy_labels='{"origin": "public", "sensitivity": "low", "legal_basis": "consent"}',
    )
    return test_db.create_claim(claim)


@pytest.fixture(name="sample_decision")
def sample_decision_fixture(test_db: Database, sample_claim: Claim) -> Decision:
    """
    Create a sample decision for testing.

    Args:
        test_db: Test database fixture
        sample_claim: Sample claim fixture

    Returns:
        Created decision
    """
    decision = Decision(
        title="Test Decision",
        context="Testing decision creation",
        options='["Option A", "Option B"]',
        decision="Choose Option A",
        reversible_flag=True,
        owners='["Alice", "Bob"]',
        checks='["Risk assessment complete", "Legal review done"]',
        related_claim_ids=f"[{sample_claim.id}]",
    )
    return test_db.create_decision(decision)
