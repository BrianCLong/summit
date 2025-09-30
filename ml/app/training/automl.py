"""AutoML training utilities for entity recognition tasks."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Any, Dict, Iterable, Optional, Sequence, Tuple
from uuid import uuid4

import numpy as np
from sklearn.metrics import f1_score, precision_score, recall_score
from sklearn.model_selection import RandomizedSearchCV, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer

from ..monitoring import track_automl_job, track_error

logger = logging.getLogger(__name__)

try:  # pragma: no cover - optional dependency
    from autoPyTorch.api.tabular_classification import TabularClassificationTask

    HAS_AUTO_PYTORCH = True
except Exception:  # pragma: no cover - optional dependency
    HAS_AUTO_PYTORCH = False
    TabularClassificationTask = None  # type: ignore


@dataclass(slots=True)
class AutoMLJobConfig:
    """Configuration for running an AutoML job."""

    metric: str = "f1"
    backend_preference: Optional[str] = None
    max_runtime_seconds: int = 60
    test_size: float = 0.2
    random_state: int = 42


@dataclass(slots=True)
class AutoMLJobResult:
    """Result payload produced by an AutoML job."""

    job_id: str
    task: str
    status: str
    backend: str
    metric: str
    best_score: float
    best_model: str
    duration_seconds: float
    created_at: str
    completed_at: str
    metrics: Dict[str, float]

    def to_dict(self) -> Dict[str, Any]:
        payload = asdict(self)
        payload["metrics"] = dict(self.metrics)
        return payload


class EntityAutoMLTrainer:
    """Run AutoML searches for entity recognition datasets."""

    TASK_NAME = "entity_recognition"

    def __init__(
        self,
        neo4j_uri: Optional[str] = None,
        neo4j_user: Optional[str] = None,
        neo4j_password: Optional[str] = None,
        driver: Any | None = None,
    ) -> None:
        self._config = {
            "uri": neo4j_uri,
            "user": neo4j_user,
            "password": neo4j_password,
        }
        self.driver = driver or self._init_driver()

    # -- Driver management -------------------------------------------------
    def _init_driver(self) -> Any | None:
        uri = self._config.get("uri")
        user = self._config.get("user")
        password = self._config.get("password")
        if not uri or not user or not password:
            return None
        try:  # pragma: no cover - external dependency
            from neo4j import GraphDatabase

            return GraphDatabase.driver(uri, auth=(user, password))
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Unable to initialise Neo4j driver for AutoML storage", exc_info=exc)
            return None

    # -- Public API --------------------------------------------------------
    def run_job(
        self,
        texts: Sequence[str],
        labels: Sequence[str],
        config: AutoMLJobConfig | None = None,
        job_id: Optional[str] = None,
    ) -> AutoMLJobResult:
        if not texts or not labels:
            raise ValueError("AutoML requires non-empty texts and labels")
        if len(texts) != len(labels):
            raise ValueError("Texts and labels must be aligned")

        job_config = config or AutoMLJobConfig()
        job_identifier = job_id or str(uuid4())

        start_time = time.perf_counter()
        backend_used = self._select_backend(job_config.backend_preference)

        try:
            best_model, best_score, metrics = self._run_search(
                backend_used, texts, labels, job_config
            )
            status = "completed"
        except Exception as exc:  # pragma: no cover - defensive
            track_error("automl", type(exc).__name__)
            logger.exception("AutoML job failed", extra={"job_id": job_identifier})
            duration = time.perf_counter() - start_time
            track_automl_job(
                self.TASK_NAME,
                backend_used,
                "failed",
                duration,
                job_config.metric,
                None,
            )
            raise

        duration = time.perf_counter() - start_time
        track_automl_job(
            self.TASK_NAME,
            backend_used,
            status,
            duration,
            job_config.metric,
            best_score,
        )

        created_at = datetime.utcnow().isoformat()
        result = AutoMLJobResult(
            job_id=job_identifier,
            task=self.TASK_NAME,
            status=status,
            backend=backend_used,
            metric=job_config.metric,
            best_score=best_score,
            best_model=best_model,
            duration_seconds=duration,
            created_at=created_at,
            completed_at=datetime.utcnow().isoformat(),
            metrics=metrics,
        )

        self._persist_result(result)
        return result

    # -- Implementation details -------------------------------------------
    def _select_backend(self, preference: Optional[str]) -> str:
        if preference and preference.lower() == "auto_pytorch" and HAS_AUTO_PYTORCH:
            return "auto_pytorch"
        if HAS_AUTO_PYTORCH and preference in {None, "auto_pytorch"}:
            return "auto_pytorch"
        return "sklearn"

    def _run_search(
        self,
        backend: str,
        texts: Sequence[str],
        labels: Sequence[str],
        job_config: AutoMLJobConfig,
    ) -> Tuple[str, float, Dict[str, float]]:
        if backend == "auto_pytorch" and HAS_AUTO_PYTORCH:  # pragma: no cover - optional
            return self._run_auto_pytorch(texts, labels, job_config)
        return self._run_sklearn(texts, labels, job_config)

    def _run_auto_pytorch(
        self,
        texts: Sequence[str],
        labels: Sequence[str],
        job_config: AutoMLJobConfig,
    ) -> Tuple[str, float, Dict[str, float]]:
        # Convert texts to TF-IDF features before handing off to Auto-PyTorch.
        vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=5000)
        X = vectorizer.fit_transform(texts).toarray()
        y = np.asarray(labels)

        X_train, X_valid, y_train, y_valid = train_test_split(
            X,
            y,
            test_size=job_config.test_size,
            random_state=job_config.random_state,
            stratify=y,
        )

        task = TabularClassificationTask()
        task.search(
            X_train=X_train,
            y_train=y_train,
            X_test=X_valid,
            y_test=y_valid,
            optimize_metric=job_config.metric,
            total_walltime_limit=job_config.max_runtime_seconds,
            func_eval_time_limit_secs=min(30, job_config.max_runtime_seconds),
        )
        predictions = task.predict(X_valid)

        metric_value = self._compute_metric(job_config.metric, y_valid, predictions)
        metrics = {
            "f1": self._compute_metric("f1", y_valid, predictions),
            "precision": self._compute_metric("precision", y_valid, predictions),
            "recall": self._compute_metric("recall", y_valid, predictions),
        }

        return "Auto-PyTorch", float(metric_value), metrics

    def _run_sklearn(
        self,
        texts: Sequence[str],
        labels: Sequence[str],
        job_config: AutoMLJobConfig,
    ) -> Tuple[str, float, Dict[str, float]]:
        pipeline = Pipeline(
            steps=[
                ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=5000)),
                (
                    "clf",
                    LogisticRegression(max_iter=1000, solver="saga"),
                ),
            ]
        )

        param_distributions = {
            "clf__C": np.logspace(-2, 2, 20),
            "clf__class_weight": [None, "balanced"],
            "tfidf__min_df": [1, 2, 3],
            "tfidf__max_df": [0.8, 0.9, 1.0],
        }

        scoring = {
            "f1": "f1_weighted",
            "precision": "precision_weighted",
            "recall": "recall_weighted",
        }.get(job_config.metric.lower(), job_config.metric)

        search = RandomizedSearchCV(
            estimator=pipeline,
            param_distributions=param_distributions,
            n_iter=15,
            scoring=scoring,
            n_jobs=1,
            cv=3,
            random_state=job_config.random_state,
        )

        search.fit(list(texts), list(labels))
        best_estimator = search.best_estimator_
        predictions = best_estimator.predict(list(texts))

        metric_value = self._compute_metric(job_config.metric, labels, predictions)
        metrics = {
            "f1": self._compute_metric("f1", labels, predictions),
            "precision": self._compute_metric("precision", labels, predictions),
            "recall": self._compute_metric("recall", labels, predictions),
        }

        best_model_description = type(best_estimator.named_steps["clf"]).__name__
        return best_model_description, float(metric_value), metrics

    def _compute_metric(
        self,
        metric: str,
        y_true: Iterable[Any],
        y_pred: Iterable[Any],
    ) -> float:
        metric = metric.lower()
        if metric == "precision":
            return float(precision_score(y_true, y_pred, average="weighted", zero_division=0))
        if metric == "recall":
            return float(recall_score(y_true, y_pred, average="weighted", zero_division=0))
        return float(f1_score(y_true, y_pred, average="weighted", zero_division=0))

    def _persist_result(self, result: AutoMLJobResult) -> None:
        if not self.driver:
            logger.debug("AutoML result persistence skipped; Neo4j driver unavailable")
            return

        query = (
            "MERGE (j:AutoMLJob {jobId: $job_id}) "
            "SET j.task = $task, j.status = $status, j.backend = $backend, "
            "j.metric = $metric, j.bestScore = $best_score, j.bestModel = $best_model, "
            "j.durationSeconds = $duration_seconds, j.createdAt = $created_at, "
            "j.completedAt = $completed_at, j.metrics = $metrics"
        )

        payload = {
            "job_id": result.job_id,
            "task": result.task,
            "status": result.status,
            "backend": result.backend,
            "metric": result.metric,
            "best_score": result.best_score,
            "best_model": result.best_model,
            "duration_seconds": result.duration_seconds,
            "created_at": result.created_at,
            "completed_at": result.completed_at,
            "metrics": result.metrics,
        }

        try:
            with self.driver.session() as session:  # pragma: no cover - requires driver
                session.execute_write(lambda tx: tx.run(query, payload))
        except Exception as exc:  # pragma: no cover - defensive
            track_error("automl", "Neo4jPersistenceError", severity="warning")
            logger.warning("Failed to persist AutoML result", exc_info=exc, extra={"job_id": result.job_id})


__all__ = [
    "AutoMLJobConfig",
    "AutoMLJobResult",
    "EntityAutoMLTrainer",
]
