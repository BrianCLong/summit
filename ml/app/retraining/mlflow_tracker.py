"""MLflow helpers for retraining pipelines."""

from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class MLflowTracker:
    """Minimal wrapper around MLflow operations for retraining jobs."""

    def __init__(
        self,
        tracking_uri: Optional[str] = None,
        experiment_name: Optional[str] = None,
    ) -> None:
        self.tracking_uri = tracking_uri or os.getenv("MLFLOW_TRACKING_URI") or "file:///tmp/mlruns"
        self.experiment_name = experiment_name or os.getenv("MLFLOW_RETRAINING_EXPERIMENT", "intelgraph-retraining")

        try:  # pragma: no cover - optional dependency
            import mlflow

            self._mlflow = mlflow
            self._mlflow.set_tracking_uri(self.tracking_uri)
            self._ensure_experiment()
        except Exception as exc:
            logger.warning("MLflow unavailable, retraining runs will not be persisted: %s", exc)
            self._mlflow = None

    def start_run(
        self,
        *,
        model_id: str,
        job_id: str,
        record_count: int,
        data_window_start: Optional[str],
        data_window_end: Optional[str],
    ) -> Optional[str]:
        """Start an MLflow run and log metadata for the retraining job."""

        if self._mlflow is None:
            return None

        run = self._mlflow.start_run(
            run_name=f"retrain-{model_id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            tags={
                "model_id": model_id,
                "retraining_job_id": job_id,
            },
        )
        self._mlflow.log_param("record_count", record_count)
        if data_window_start:
            self._mlflow.log_param("data_window_start", data_window_start)
        if data_window_end:
            self._mlflow.log_param("data_window_end", data_window_end)
        return run.info.run_id

    def complete_run(self, run_id: Optional[str], status: str, metrics: Optional[Dict[str, float]] = None) -> None:
        if self._mlflow is None or run_id is None:
            return

        metrics = metrics or {}
        for name, value in metrics.items():
            try:
                self._mlflow.log_metric(name, float(value))
            except Exception as exc:  # pragma: no cover - logging only
                logger.debug("Unable to log MLflow metric %s=%s: %s", name, value, exc)

        self._mlflow.set_tag("retraining_status", status)
        self._mlflow.end_run(status="FINISHED" if status == "completed" else "FAILED")

    # ------------------------------------------------------------------
    def _ensure_experiment(self) -> None:
        if self._mlflow is None:
            return
        experiment = self._mlflow.get_experiment_by_name(self.experiment_name)
        if experiment is None:
            self._mlflow.create_experiment(self.experiment_name)
        self._mlflow.set_experiment(self.experiment_name)


__all__ = ["MLflowTracker"]
