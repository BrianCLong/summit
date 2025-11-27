from __future__ import annotations

from datetime import datetime
from typing import Any

try:
    import psycopg
except ImportError:  # pragma: no cover - optional dependency for local testing
    psycopg = None


class BaseProvenanceStore:
    def record_hash(self, tenant_id: str, case_id: str, payload_hash: str, source: str, actor: str) -> None:
        raise NotImplementedError


class InMemoryProvenanceStore(BaseProvenanceStore):
    def __init__(self):
        self.records: list[dict[str, Any]] = []

    def record_hash(self, tenant_id: str, case_id: str, payload_hash: str, source: str, actor: str) -> None:
        self.records.append(
            {
                "tenant_id": tenant_id,
                "case_id": case_id,
                "hash": payload_hash,
                "source": source,
                "actor": actor,
                "recorded_at": datetime.utcnow().isoformat(),
            }
        )


class PostgresProvenanceStore(BaseProvenanceStore):
    def __init__(self, dsn: str):
        if psycopg is None:
            raise RuntimeError("psycopg is required for Postgres provenance storage")
        self.conn = psycopg.connect(dsn, autocommit=True)
        self._ensure_table()

    def _ensure_table(self) -> None:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS provenance_hashes (
                    id SERIAL PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    case_id TEXT NOT NULL,
                    hash TEXT NOT NULL,
                    source TEXT,
                    actor TEXT,
                    recorded_at TIMESTAMPTZ DEFAULT now()
                );
                """
            )

    def record_hash(self, tenant_id: str, case_id: str, payload_hash: str, source: str, actor: str) -> None:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO provenance_hashes (tenant_id, case_id, hash, source, actor)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (tenant_id, case_id, payload_hash, source, actor),
            )

    def close(self) -> None:
        self.conn.close()
