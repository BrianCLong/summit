"""Utilities for refining narrative prompts based on analyst feedback."""

import logging
from typing import Dict

try:
    from intelgraph_postgres_client import IntelGraphPostgresClient
except Exception:  # pragma: no cover - optional dependency
    IntelGraphPostgresClient = None

logger = logging.getLogger(__name__)


def record_feedback(prompt_hash: str, narrative_hash: str, rating: str, pg_config: Dict[str, str]) -> None:
    """Persist feedback in Postgres for future prompt tuning."""
    if not IntelGraphPostgresClient:
        logger.warning("Postgres client unavailable; feedback not logged")
        return
    client = IntelGraphPostgresClient(pg_config)
    client.log_processing_event(
        event_type="NARRATIVE_PROMPT_FEEDBACK",
        narrative_id=narrative_hash,
        message=rating,
        metadata={"prompt_hash": prompt_hash},
    )
    client.close()
