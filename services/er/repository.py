"""Persistence layer for merge decisions and audit trail."""

from __future__ import annotations

import uuid
from contextlib import contextmanager
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Column, DateTime, Float, MetaData, String, Table, create_engine, select, update
from sqlalchemy.engine import Engine
from sqlalchemy.sql import func

from .models import AuditEvent, MergeScorecard, Policy


metadata = MetaData()

merge_decisions = Table(
    "er_merge_decisions",
    metadata,
    Column("merge_id", String, primary_key=True),
    Column("entity_ids", JSON, nullable=False),
    Column("policy_tags", JSON, nullable=False),
    Column("confidence", Float, nullable=False),
    Column("decayed_confidence", Float, nullable=False),
    Column("scorecard", JSON, nullable=False),
    Column("human_overrides", JSON, nullable=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now(), nullable=False),
    Column("undone_at", DateTime(timezone=True), nullable=True),
)

audit_log = Table(
    "er_audit_log",
    metadata,
    Column("event_id", String, primary_key=True),
    Column("action", String, nullable=False),
    Column("actor", String, nullable=False),
    Column("details", JSON, nullable=False),
    Column("created_at", DateTime(timezone=True), server_default=func.now(), nullable=False),
)

schema_migrations = Table(
    "er_schema_migrations",
    metadata,
    Column("version", String, primary_key=True),
    Column("applied_at", DateTime(timezone=True), server_default=func.now(), nullable=False),
)


@contextmanager
def session(engine: Engine):
    with engine.begin() as connection:
        yield connection


class MigrationManager:
    VERSION = "001_initial"

    def __init__(self, engine: Engine) -> None:
        self.engine = engine

    def apply(self) -> None:
        metadata.create_all(self.engine, tables=[merge_decisions, audit_log, schema_migrations])
        with session(self.engine) as conn:
            existing = conn.execute(select(schema_migrations.c.version).where(schema_migrations.c.version == self.VERSION)).scalar()
            if not existing:
                conn.execute(schema_migrations.insert().values(version=self.VERSION))

    def rollback_last(self) -> None:
        with session(self.engine) as conn:
            version = conn.execute(select(schema_migrations.c.version).order_by(schema_migrations.c.applied_at.desc())).scalar()
            if not version:
                return
            conn.execute(schema_migrations.delete().where(schema_migrations.c.version == version))
        metadata.drop_all(self.engine, tables=[merge_decisions, audit_log])


class DecisionRepository:
    def __init__(self, engine: Engine) -> None:
        self.engine = engine

    @classmethod
    def from_url(cls, url: str) -> "DecisionRepository":
        engine = create_engine(url, future=True)
        return cls(engine)

    def record_merge(
        self,
        entity_ids: list[str],
        policy: Policy,
        scorecard: MergeScorecard,
        confidence: float,
        decayed_confidence: float,
        human_overrides: dict[str, float] | None,
        actor: str,
    ) -> str:
        merge_id = str(uuid.uuid4())
        with session(self.engine) as conn:
            conn.execute(
                merge_decisions.insert().values(
                    merge_id=merge_id,
                    entity_ids=entity_ids,
                    policy_tags=policy.tags,
                    confidence=confidence,
                    decayed_confidence=decayed_confidence,
                    scorecard=scorecard.model_dump(),
                    human_overrides=human_overrides,
                )
            )
            conn.execute(
                audit_log.insert().values(
                    event_id=str(uuid.uuid4()),
                    action="merge",
                    actor=actor,
                    details={
                        "entities": entity_ids,
                        "policy_tags": policy.tags,
                        "why": scorecard.rationale,
                    },
                )
            )
        return merge_id

    def mark_split(self, merge_id: str, actor: str, reason: str) -> None:
        with session(self.engine) as conn:
            conn.execute(
                update(merge_decisions)
                .where(merge_decisions.c.merge_id == merge_id)
                .values(undone_at=datetime.utcnow())
            )
            conn.execute(
                audit_log.insert().values(
                    event_id=str(uuid.uuid4()),
                    action="split",
                    actor=actor,
                    details={"merge_id": merge_id, "reason": reason},
                )
            )

    def fetch_merge(self, merge_id: str) -> dict[str, Any] | None:
        with session(self.engine) as conn:
            row = conn.execute(select(merge_decisions).where(merge_decisions.c.merge_id == merge_id)).mappings().first()
            return dict(row) if row else None

    def list_audit_events(self) -> list[AuditEvent]:
        with session(self.engine) as conn:
            rows = conn.execute(select(audit_log).order_by(audit_log.c.created_at)).mappings()
            events: list[AuditEvent] = []
            for row in rows:
                events.append(
                    AuditEvent(
                        event_id=row["event_id"],
                        action=row["action"],
                        actor=row["actor"],
                        timestamp=row["created_at"],
                        details=row["details"],
                    )
                )
            return events

    def latest_migration(self) -> str | None:
        with session(self.engine) as conn:
            row = conn.execute(select(schema_migrations.c.version).order_by(schema_migrations.c.applied_at.desc())).scalar()
            return row
