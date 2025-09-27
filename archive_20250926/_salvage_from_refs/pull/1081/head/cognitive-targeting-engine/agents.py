"""Asynchronous counter‑psyops agents.

These agents watch for deception tagged entities and simulate simple
countermeasures.  Activities are logged to Neo4j as ``:COUNTERMEASURE``
edges for traceability.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any

from intelgraph_neo4j_client import IntelGraphNeo4jClient

logger = logging.getLogger(__name__)


@dataclass
class AgentConfig:
    neo4j: dict[str, Any]
    threshold: float = 0.5


class CounterPsyopsAgent:
    """Minimal async agent for counter‑measures."""

    def __init__(self, config: AgentConfig):
        self.config = config
        self.client = IntelGraphNeo4jClient(config.neo4j)
        self.queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()

    async def monitor(self) -> None:
        """Continuously process entities from the internal queue."""
        while True:
            entity = await self.queue.get()
            try:
                await self._handle_entity(entity)
            finally:
                self.queue.task_done()

    async def enqueue(self, entity: dict[str, Any]) -> None:
        if entity.get("deception_score", 0) >= self.config.threshold:
            await self.queue.put(entity)

    async def _handle_entity(self, entity: dict[str, Any]) -> None:
        decoy_id = f"decoy_{entity['id']}"
        logger.info("Simulating countermeasure for %s -> %s", entity["id"], decoy_id)
        self.client.create_or_update_entity("Decoy", {"id": decoy_id})
        self.client.create_relationship(
            "Entity",
            "id",
            entity["id"],
            "Decoy",
            "id",
            decoy_id,
            "COUNTERMEASURE",
            {"confidence": entity.get("deception_score", 0)},
        )

    async def run(self, entities: Iterable[dict[str, Any]]) -> None:
        for e in entities:
            await self.enqueue(e)
        await asyncio.gather(self.monitor(), self.queue.join())
