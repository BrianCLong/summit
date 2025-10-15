"""Feed-processor data access helpers for retraining jobs."""

from __future__ import annotations

import asyncio
import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class FeedBatch:
    """Container describing a batch of ingested feed records."""

    job_ids: List[str]
    record_count: int
    window_start: datetime
    window_end: datetime
    sample: List[Dict[str, Any]]


class FeedDataFetcher:
    """Fetch new data emitted by the feed-processor for retraining.

    The feed-processor writes entities into Neo4j with an ``ingestion_job``
    marker.  We look for new jobs that landed since the last retraining window
    and build a lightweight sample that the training pipeline can use for
    validation.  In local development or tests where Neo4j is not available we
    gracefully fall back to reading JSON fixtures produced by the
    feed-processor's simulation harness (``simulated_ingestion``).
    """

    def __init__(
        self,
        neo4j_uri: Optional[str] = None,
        neo4j_user: Optional[str] = None,
        neo4j_password: Optional[str] = None,
        fixture_dir: Optional[Path] = None,
    ) -> None:
        self._fixture_dir = fixture_dir or Path("simulated_ingestion/fixtures")
        self._driver = None
        self._neo4j_available = False

        neo4j_uri = neo4j_uri or os.getenv("NEO4J_URI")
        if neo4j_uri:
            try:  # pragma: no cover - exercised in integration environments
                from neo4j import GraphDatabase

                self._driver = GraphDatabase.driver(
                    neo4j_uri,
                    auth=(
                        neo4j_user or os.getenv("NEO4J_USER", "neo4j"),
                        neo4j_password or os.getenv("NEO4J_PASSWORD", "test"),
                    ),
                )
                self._neo4j_available = True
                logger.info("FeedDataFetcher connected to Neo4j", {"uri": neo4j_uri})
            except Exception as exc:  # pragma: no cover - best effort logging
                logger.warning(
                    "Falling back to fixture-based feed data: %s", exc,
                    exc_info=False,
                )
                self._driver = None
        else:
            logger.debug("NEO4J_URI not set; using fixture-based feed data")

    async def fetch_new_data(self, since: Optional[datetime]) -> FeedBatch:
        """Return feed records ingested after ``since``.

        Args:
            since: Upper bound timestamp from the last successful retraining
                window.  ``None`` returns the most recent batch.
        """

        if self._neo4j_available and self._driver:
            return await asyncio.get_running_loop().run_in_executor(
                None, self._fetch_from_neo4j, since
            )

        return await asyncio.get_running_loop().run_in_executor(
            None, self._fetch_from_fixtures, since
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------
    def _fetch_from_neo4j(self, since: Optional[datetime]) -> FeedBatch:
        assert self._driver is not None
        query = (
            "MATCH (n:Entity) "
            "WHERE n.ingestion_job IS NOT NULL "
            "  AND n.updated_at IS NOT NULL "
            "  AND ($since IS NULL OR n.updated_at > $since) "
            "RETURN n.ingestion_job AS job_id, "
            "       datetime(n.updated_at) AS updated_at, "
            "       n AS entity "
            "ORDER BY updated_at DESC "
            "LIMIT 500"
        )
        job_ids: List[str] = []
        entities: List[Dict[str, Any]] = []
        window_start = datetime.max.replace(tzinfo=timezone.utc)
        window_end = datetime.min.replace(tzinfo=timezone.utc)

        with self._driver.session() as session:
            result = session.run(
                query,
                since=since.isoformat() if since else None,
            )
            for record in result:
                job_id = record["job_id"]
                node = record["entity"]
                updated_at = record["updated_at"].to_native()
                job_ids.append(job_id)
                window_start = min(window_start, updated_at)
                window_end = max(window_end, updated_at)
                entities.append(dict(node))

        if not entities:
            now = datetime.now(timezone.utc)
            return FeedBatch([], 0, now, now, [])

        sample = entities[: min(5, len(entities))]
        return FeedBatch(
            job_ids=list(dict.fromkeys(job_ids)),
            record_count=len(entities),
            window_start=window_start,
            window_end=window_end,
            sample=sample,
        )

    def _fetch_from_fixtures(self, since: Optional[datetime]) -> FeedBatch:
        if not self._fixture_dir.exists():
            now = datetime.now(timezone.utc)
            return FeedBatch([], 0, now, now, [])

        files = sorted(self._fixture_dir.glob("*.json"))
        if not files:
            now = datetime.now(timezone.utc)
            return FeedBatch([], 0, now, now, [])

        latest_file = files[-1]
        try:
            payload = json.loads(latest_file.read_text())
        except json.JSONDecodeError as exc:
            logger.error("Invalid feed fixture %s: %s", latest_file, exc)
            now = datetime.now(timezone.utc)
            return FeedBatch([], 0, now, now, [])

        records = payload.get("records", [])
        timestamp = payload.get("ingested_at")
        ingested_at = (
            datetime.fromisoformat(timestamp)
            if timestamp
            else datetime.now(timezone.utc)
        )

        if since and ingested_at <= since:
            now = datetime.now(timezone.utc)
            return FeedBatch([], 0, now, now, [])

        job_id = payload.get("job_id", latest_file.stem)
        return FeedBatch(
            job_ids=[job_id],
            record_count=len(records),
            window_start=ingested_at - timedelta(minutes=5),
            window_end=ingested_at,
            sample=records[: min(5, len(records))],
        )


__all__ = ["FeedBatch", "FeedDataFetcher"]
