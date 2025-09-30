"""Tests for the automated retraining manager."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, Optional

import pytest

import sys

SUMMIT_ROOT = Path(__file__).resolve().parents[3]
ML_ROOT = Path(__file__).resolve().parents[2]
for path in (SUMMIT_ROOT, ML_ROOT):
    str_path = str(path)
    if str_path not in sys.path:
        sys.path.insert(0, str_path)

from ml.app.retraining.manager import RetrainingManager, RetrainingJobStatus
from ml.app.retraining.data import FeedBatch


class FakeDataFetcher:
    def __init__(self, record_count: int = 100) -> None:
        self.record_count = record_count
        self.called_with: Optional[datetime] = None

    async def fetch_new_data(self, since: Optional[datetime]) -> FeedBatch:
        self.called_with = since
        now = datetime.now(timezone.utc)
        return FeedBatch(
            job_ids=["job-1"],
            record_count=self.record_count,
            window_start=now - timedelta(minutes=5),
            window_end=now,
            sample=[{"id": "1"} for _ in range(min(5, self.record_count))],
        )


class FakeScheduler:
    def __init__(self) -> None:
        self.scheduled = []

    async def schedule(
        self,
        *,
        job_id: str,
        model_id: str,
        data_window_start: Optional[str],
        data_window_end: Optional[str],
        extra_env: Optional[Dict[str, str]] = None,
    ):
        self.scheduled.append(
            {
                "job_id": job_id,
                "model_id": model_id,
                "data_window_start": data_window_start,
                "data_window_end": data_window_end,
                "extra_env": extra_env or {},
            }
        )
        return type("Job", (), {
            "job_name": f"ml-retrain-{job_id[:8]}",
            "namespace": "default",
            "manifest": {
                "metadata": {"name": f"ml-retrain-{job_id[:8]}", "namespace": "default"}
            },
        })()


class FakeTracker:
    def __init__(self) -> None:
        self.started = []
        self.completed = []

    def start_run(
        self,
        *,
        model_id: str,
        job_id: str,
        record_count: int,
        data_window_start: Optional[str],
        data_window_end: Optional[str],
    ) -> str:
        run_id = f"run-{len(self.started)}"
        self.started.append(
            {
                "model_id": model_id,
                "job_id": job_id,
                "record_count": record_count,
                "data_window_start": data_window_start,
                "data_window_end": data_window_end,
                "run_id": run_id,
            }
        )
        return run_id

    def complete_run(self, run_id: Optional[str], status: str, metrics: Dict[str, float]) -> None:
        self.completed.append({"run_id": run_id, "status": status, "metrics": metrics})


@pytest.mark.asyncio
async def test_trigger_retraining_schedules_job():
    fetcher = FakeDataFetcher(record_count=120)
    scheduler = FakeScheduler()
    tracker = FakeTracker()
    manager = RetrainingManager(
        data_fetcher=fetcher,
        scheduler=scheduler,
        tracker=tracker,
        min_records=50,
    )

    status = await manager.trigger_retraining("model-123", reason="drift")

    assert status.status == "scheduled"
    assert status.records == 120
    assert status.reason == "drift"
    assert status.mlflow_run_id == "run-0"
    assert scheduler.scheduled[0]["model_id"] == "model-123"
    assert scheduler.scheduled[0]["extra_env"]["RETRAINING_REASON"] == "drift"
    assert tracker.started[0]["record_count"] == 120


@pytest.mark.asyncio
async def test_trigger_retraining_requires_minimum_records():
    manager = RetrainingManager(
        data_fetcher=FakeDataFetcher(record_count=10),
        scheduler=FakeScheduler(),
        tracker=FakeTracker(),
        min_records=50,
    )

    with pytest.raises(ValueError):
        await manager.trigger_retraining("model-123")


@pytest.mark.asyncio
async def test_update_job_status_tracks_completion():
    fetcher = FakeDataFetcher(record_count=60)
    scheduler = FakeScheduler()
    tracker = FakeTracker()
    manager = RetrainingManager(
        data_fetcher=fetcher,
        scheduler=scheduler,
        tracker=tracker,
        min_records=50,
    )

    status = await manager.trigger_retraining("model-abc")
    updated = await manager.update_job_status(
        status.job_id,
        status="running",
        metrics={"records": 60},
    )
    assert isinstance(updated, RetrainingJobStatus)
    assert updated.status == "running"
    assert "records" in updated.metrics

    completed = await manager.update_job_status(
        status.job_id,
        status="completed",
        metrics={"f1_score": 0.92},
    )
    assert completed.status == "completed"
    assert tracker.completed[-1]["status"] == "completed"
    assert tracker.completed[-1]["metrics"]["f1_score"] == 0.92
    assert manager._last_successful_window is not None
