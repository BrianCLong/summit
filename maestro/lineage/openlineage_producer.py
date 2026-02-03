import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

try:
    from openlineage.client import OpenLineageClient
    from openlineage.client.run import Job, RunEvent, RunState
    from openlineage.client.run import Run as OLRun
    from openlineage.client.transport.console import ConsoleTransport
except ImportError:
    logger.warning("OpenLineage client not found. Lineage events will not be emitted.")
    OpenLineageClient = None

class OpenLineageProducer:
    def __init__(self, client=None):
        if client:
            self.client = client
        elif OpenLineageClient:
            # Use environment variables if set, otherwise default to Console
            import os
            if os.getenv("OPENLINEAGE_URL"):
                self.client = OpenLineageClient()
            else:
                self.client = OpenLineageClient(transport=ConsoleTransport())
        else:
            self.client = None

    def emit_start(self, run_id: str, job_name: str, inputs: list[Any] = None, outputs: list[Any] = None, args: dict[str, Any] = None):
        """
        Emit a START event for a run.
        """
        if not self.client:
            return

        event_time = datetime.utcnow().isoformat()

        run_event = RunEvent(
            eventType=RunState.START,
            eventTime=event_time,
            run=OLRun(runId=run_id),
            job=Job(namespace="summit.maestro", name=job_name),
            inputs=inputs or [],
            outputs=outputs or [],
            producer="https://github.com/BrianCLong/summit/maestro"
        )

        try:
            self.client.emit(run_event)
            logger.info(f"Emitted OpenLineage START event for run {run_id}")
        except Exception as e:
            logger.error(f"Failed to emit OpenLineage event: {e}")

    def emit_complete(self, run_id: str, job_name: str, inputs: list[Any] = None, outputs: list[Any] = None):
        """
        Emit a COMPLETE event for a run.
        """
        if not self.client:
            return

        event_time = datetime.utcnow().isoformat()

        run_event = RunEvent(
            eventType=RunState.COMPLETE,
            eventTime=event_time,
            run=OLRun(runId=run_id),
            job=Job(namespace="summit.maestro", name=job_name),
            inputs=inputs or [],
            outputs=outputs or [],
            producer="https://github.com/BrianCLong/summit/maestro"
        )

        try:
            self.client.emit(run_event)
            logger.info(f"Emitted OpenLineage COMPLETE event for run {run_id}")
        except Exception as e:
            logger.error(f"Failed to emit OpenLineage event: {e}")

    def emit_fail(self, run_id: str, job_name: str, error_message: str = None):
        """
        Emit a FAIL event for a run.
        """
        if not self.client:
            return

        event_time = datetime.utcnow().isoformat()

        run_event = RunEvent(
            eventType=RunState.FAIL,
            eventTime=event_time,
            run=OLRun(runId=run_id),
            job=Job(namespace="summit.maestro", name=job_name),
            inputs=[],
            outputs=[],
            producer="https://github.com/BrianCLong/summit/maestro"
        )

        try:
            self.client.emit(run_event)
            logger.info(f"Emitted OpenLineage FAIL event for run {run_id}")
        except Exception as e:
            logger.error(f"Failed to emit OpenLineage event: {e}")
