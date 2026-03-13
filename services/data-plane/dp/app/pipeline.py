"""
Data plane pipeline orchestrator.

Ties together:
  connector → normalize → entity_resolve → evidence_id → store

The pipeline is designed to be called from the FastAPI app but can also
be driven directly (e.g. from a scheduled job or a CLI command).
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from .connectors.base import ConnectorBase
from .entity_resolution import EntityResolver, EntityStore
from .evidence import evidence_id_for_run
from .models import CanonicalEvent, PipelineRun, PipelineStatus
from .normalize import normalize_record

logger = logging.getLogger(__name__)


class DataPipeline:
    """
    End-to-end data plane pipeline.

    Usage::

        store = EntityStore()
        pipeline = DataPipeline(connector, entity_resolver=EntityResolver(store))
        run = await pipeline.execute(tenant_id="acme", config={...})
    """

    def __init__(
        self,
        connector: ConnectorBase,
        entity_resolver: EntityResolver | None = None,
        source_service: str = "data-plane",
    ) -> None:
        self._connector = connector
        self._resolver = entity_resolver or EntityResolver()
        self._source_service = source_service

    async def execute(
        self,
        tenant_id: str,
        config: dict[str, Any] | None = None,
    ) -> PipelineRun:
        """
        Run the full pipeline and return a PipelineRun record.

        Steps:
          1. discover() – list available sources
          2. pull() each source → ConnectorRecord stream
          3. normalize_record() → CanonicalEvent
          4. entity_resolver.process() → CanonicalEntity list
          5. generate evidence ID for the batch
        """
        cfg = config or {}
        run = PipelineRun(
            connector=type(self._connector).__name__,
            config=cfg,
            status=PipelineStatus.RUNNING,
        )

        events: list[CanonicalEvent] = []

        try:
            sources = await self._connector.discover()
            logger.info(
                "pipeline.execute sources=%d connector=%s",
                len(sources),
                run.connector,
            )

            for source in sources:
                async for raw_record in self._connector.pull(source):
                    event = normalize_record(
                        raw_record,
                        tenant_id=tenant_id,
                        source_service=self._source_service,
                        correlation_id=run.run_id,
                    )
                    events.append(event)
                    run.events_ingested += 1

                    # Resolve entities inline; attach evidence ID after batch
                    self._resolver.process(event, evidence_id=None)

            # Generate a single deterministic evidence ID for this run's batch.
            # Use content_hash() (not random event_id) so the ID is reproducible
            # when the same source data is ingested more than once.
            evidence_id = evidence_id_for_run(
                pipeline=run.connector,
                event_ids=sorted(e.content_hash() for e in events),
                run_config=cfg,
            )
            run.evidence_ids.append(evidence_id)

            # Back-fill evidence_id onto all resolved entities
            for entity in self._resolver.store.get_all():
                if evidence_id not in entity.evidence_ids:
                    entity.evidence_ids.append(evidence_id)

            run.entities_resolved = self._resolver.store.count()
            run.status = PipelineStatus.COMPLETED
            run.completed_at = datetime.now(UTC).isoformat()

            logger.info(
                "pipeline.execute completed run_id=%s events=%d entities=%d evidence=%s",
                run.run_id,
                run.events_ingested,
                run.entities_resolved,
                evidence_id,
            )

        except Exception as exc:
            run.status = PipelineStatus.FAILED
            run.error = str(exc)
            run.completed_at = datetime.now(UTC).isoformat()
            logger.exception("pipeline.execute failed run_id=%s", run.run_id)

        return run
