"""
Database persistence layer for IntelGraph.

Provides SQLite-backed storage with migration-ready structure.
Keeps things simple and testable - no heavy ORM magic.
"""

import os
from typing import Any, List, Optional

from sqlmodel import Session, SQLModel, create_engine, select

from .models import Claim, Decision, Entity, Source


class Database:
    """
    Simple database abstraction for IntelGraph.

    Uses SQLModel with SQLite for development and testing.
    Migration-ready: can swap SQLite URL for PostgreSQL in production.
    """

    def __init__(self, database_url: Optional[str] = None):
        """
        Initialize database connection.

        Args:
            database_url: Database connection string. Defaults to SQLite in ./data/intelgraph.db
        """
        if database_url is None:
            os.makedirs("./data", exist_ok=True)
            database_url = "sqlite:///./data/intelgraph.db"

        # echo=True for development visibility; set False in production
        self.engine = create_engine(
            database_url, echo=False, connect_args={"check_same_thread": False}
        )

    def create_tables(self) -> None:
        """Create all tables. Idempotent - safe to call multiple times."""
        SQLModel.metadata.create_all(self.engine)

    def get_session(self) -> Session:
        """Get a new database session. Caller is responsible for closing."""
        return Session(self.engine)

    # Entity operations

    def create_entity(self, entity: Entity) -> Entity:
        """Create a new entity."""
        with self.get_session() as session:
            session.add(entity)
            session.commit()
            session.refresh(entity)
            return entity

    def list_entities(self, limit: int = 100, offset: int = 0) -> List[Entity]:
        """List all entities with pagination."""
        with self.get_session() as session:
            statement = select(Entity).offset(offset).limit(limit)
            return list(session.exec(statement))

    def get_entity(self, entity_id: int) -> Optional[Entity]:
        """Get entity by ID."""
        with self.get_session() as session:
            return session.get(Entity, entity_id)

    # Claim operations

    def create_claim(self, claim: Claim) -> Claim:
        """Create a new claim."""
        with self.get_session() as session:
            session.add(claim)
            session.commit()
            session.refresh(claim)
            return claim

    def list_claims(self, limit: int = 100, offset: int = 0) -> List[Claim]:
        """List all claims with pagination."""
        with self.get_session() as session:
            statement = select(Claim).offset(offset).limit(limit)
            return list(session.exec(statement))

    def get_claims_by_entity(self, entity_id: int) -> List[Claim]:
        """Get all claims for a specific entity."""
        with self.get_session() as session:
            statement = select(Claim).where(Claim.entity_id == entity_id)
            return list(session.exec(statement))

    # Decision operations

    def create_decision(self, decision: Decision) -> Decision:
        """Create a new decision."""
        with self.get_session() as session:
            session.add(decision)
            session.commit()
            session.refresh(decision)
            return decision

    def list_decisions(self, limit: int = 100, offset: int = 0) -> List[Decision]:
        """List all decisions with pagination."""
        with self.get_session() as session:
            statement = select(Decision).offset(offset).limit(limit)
            return list(session.exec(statement))

    def get_decision(self, decision_id: int) -> Optional[Decision]:
        """Get decision by ID."""
        with self.get_session() as session:
            return session.get(Decision, decision_id)

    # Source operations

    def create_source(self, source: Source) -> Source:
        """Create a new source."""
        with self.get_session() as session:
            session.add(source)
            session.commit()
            session.refresh(source)
            return source

    def list_sources(self, limit: int = 100, offset: int = 0) -> List[Source]:
        """List all sources with pagination."""
        with self.get_session() as session:
            statement = select(Source).offset(offset).limit(limit)
            return list(session.exec(statement))

    def get_source(self, source_id: int) -> Optional[Source]:
        """Get source by ID."""
        with self.get_session() as session:
            return session.get(Source, source_id)


# Global database instance
_db: Optional[Database] = None


def get_database(database_url: Optional[str] = None) -> Database:
    """
    Get or create the global database instance.

    Args:
        database_url: Optional database URL. Only used on first call.

    Returns:
        Database instance
    """
    global _db
    if _db is None:
        _db = Database(database_url)
        _db.create_tables()
    return _db


def reset_database() -> None:
    """Reset the global database instance. Useful for testing."""
    global _db
    _db = None
