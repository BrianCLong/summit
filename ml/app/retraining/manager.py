"""High level orchestration for automated retraining."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

from .data import FeedDataFetcher
from .kubernetes import KubernetesJobScheduler
from .mlflow_tracker import MLflowTracker

logger = logging.getLogger(__name__)


@dataclass
class RetrainingJobStatus:
    """Represents the lifecycle of a retraining job."""

    job_id: str
    model_id: str
    status: str
    scheduled_at: datetime
    data_window_start: Optional[datetime]
    data_window_end: Optional[datetime]
    records: int
    reason: Optional[str] = None
    kubernetes_job_name: Optional[str] = None
    kubernetes_namespace: Optional[str] = None
    mlflow_run_id: Optional[str] = None
    metrics: Dict[str, float] = field(default_factory=dict)
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    def to_dict(self) -> Dict[str, object]:
        return {
            "id": self.job_id,
            "modelId": self.model_id,
            "status": self.status,
            "scheduledAt": self.scheduled_at.isoformat(),
            "dataWindowStart": self.data_window_start.isoformat() if self.data_window_start else None,
            "dataWindowEnd": self.data_window_end.isoformat() if self.data_window_end else None,
            "records": self.records,
            "reason": self.reason,
            "kubernetesJobName": self.kubernetes_job_name,
            "kubernetesNamespace": self.kubernetes_namespace,
            "mlflowRunId": self.mlflow_run_id,
            "metrics": self.metrics,
            "error": self.error,
            "startedAt": self.started_at.isoformat() if self.started_at else None,
            "completedAt": self.completed_at.isoformat() if self.completed_at else None,
        }


class RetrainingManager:
    """Coordinates data collection, scheduling, and tracking of retraining."""

    def __init__(
        self,
        *,
        data_fetcher: Optional[FeedDataFetcher] = None,
        scheduler: Optional[KubernetesJobScheduler] = None,
        tracker: Optional[MLflowTracker] = None,
        min_records: int = 50,
    ) -> None:
        self.data_fetcher = data_fetcher or FeedDataFetcher()
        self.scheduler = scheduler or KubernetesJobScheduler()
        self.tracker = tracker or MLflowTracker()
        self.min_records = min_records
        self._jobs: Dict[str, RetrainingJobStatus] = {}
        self._lock = asyncio.Lock()
        self._last_successful_window: Optional[datetime] = None

    async def trigger_retraining(self, model_id: str, *, reason: Optional[str] = None) -> RetrainingJobStatus:
        """Inspect new feed data and, if sufficient, schedule retraining."""

        async with self._lock:
            batch = await self.data_fetcher.fetch_new_data(self._last_successful_window)
            if batch.record_count < self.min_records:
                raise ValueError(
                    f"Insufficient new data for retraining: {batch.record_count} < {self.min_records}"
                )

            job_id = str(uuid4())
            scheduled_at = datetime.now(timezone.utc)
            data_window_start = batch.window_start
            data_window_end = batch.window_end

            mlflow_run_id = self.tracker.start_run(
                model_id=model_id,
                job_id=job_id,
                record_count=batch.record_count,
                data_window_start=data_window_start.isoformat() if data_window_start else None,
                data_window_end=data_window_end.isoformat() if data_window_end else None,
            )

            scheduled_job = await self.scheduler.schedule(
                job_id=job_id,
                model_id=model_id,
                data_window_start=data_window_start.isoformat() if data_window_start else None,
                data_window_end=data_window_end.isoformat() if data_window_end else None,
                extra_env={
                    "MLFLOW_RUN_ID": mlflow_run_id or "",
                    "RETRAINING_REASON": reason or "automated",
                },
            )

            status = RetrainingJobStatus(
                job_id=job_id,
                model_id=model_id,
                status="scheduled",
                scheduled_at=scheduled_at,
                data_window_start=data_window_start,
                data_window_end=data_window_end,
                records=batch.record_count,
                reason=reason,
                kubernetes_job_name=scheduled_job.job_name,
                kubernetes_namespace=scheduled_job.namespace,
                mlflow_run_id=mlflow_run_id,
            )
            self._jobs[job_id] = status
            return status

    async def list_jobs(self) -> List[RetrainingJobStatus]:
        async with self._lock:
            return sorted(
                self._jobs.values(),
                key=lambda job: job.scheduled_at,
                reverse=True,
            )

    async def get_job(self, job_id: str) -> Optional[RetrainingJobStatus]:
        async with self._lock:
            return self._jobs.get(job_id)

    async def update_job_status(
        self,
        job_id: str,
        *,
        status: Optional[str] = None,
        metrics: Optional[Dict[str, float]] = None,
        error: Optional[str] = None,
    ) -> Optional[RetrainingJobStatus]:
        async with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return None

            if status:
                job.status = status
                now = datetime.now(timezone.utc)
                if status == "running" and job.started_at is None:
                    job.started_at = now
                if status in {"completed", "failed"}:
                    job.completed_at = now
                    if status == "completed":
                        self._last_successful_window = job.data_window_end

            if metrics:
                job.metrics.update(metrics)

            if status in {"completed", "failed"}:
                self.tracker.complete_run(job.mlflow_run_id, job.status, job.metrics)

            if error:
                job.error = error

            return job


__all__ = ["RetrainingManager", "RetrainingJobStatus"]
