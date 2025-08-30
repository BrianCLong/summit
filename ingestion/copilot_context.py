"""Utility for normalizing evidence into graph-friendly context nodes."""

from __future__ import annotations

import logging
from typing import Any

from intelgraph_neo4j_client import IntelGraphNeo4jClient

logger = logging.getLogger(__name__)


class CopilotContextIngestor:
    """Normalize evidence and push :COPILOT_CONTEXT nodes into Neo4j."""

    def __init__(self, client: IntelGraphNeo4jClient) -> None:
        self.client = client

    def _build_node(self, case_id: str, data: dict[str, Any]) -> dict[str, Any]:
        payload = {"case_id": case_id, **data, "labels": ["COPILOT_CONTEXT"]}
        logger.debug("Built context payload: %s", payload)
        return payload

    def ingest_alert(self, case_id: str, alert: dict[str, Any]) -> dict[str, Any]:
        node = self._build_node(case_id, {"type": "alert", "data": alert})
        return self.client.create_or_update_entity("Evidence", node)

    def ingest_log(self, case_id: str, log_entry: dict[str, Any]) -> dict[str, Any]:
        node = self._build_node(case_id, {"type": "log", "data": log_entry})
        return self.client.create_or_update_entity("Evidence", node)

    def ingest_note(self, case_id: str, note: str) -> dict[str, Any]:
        node = self._build_node(case_id, {"type": "note", "text": note})
        return self.client.create_or_update_entity("Evidence", node)
