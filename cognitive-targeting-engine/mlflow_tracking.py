"""Utilities for integrating MLflow with the cognitive targeting engine."""

import json
import logging
import os
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import mlflow
from mlflow.exceptions import MlflowException
from mlflow.tracking import MlflowClient

_LOGGER = logging.getLogger(__name__)

_DEFAULT_EXPERIMENT_NAME = os.getenv("MLFLOW_EXPERIMENT_NAME", "cognitive-targeting-engine")


def _default_tracking_uri() -> str:
    """Return the default tracking URI, ensuring the backing directory exists."""
    base_path = Path(__file__).resolve().parent / "mlruns"
    base_path.mkdir(parents=True, exist_ok=True)
    return base_path.as_uri()


def _ensure_tracking_uri() -> str:
    tracking_uri = os.getenv("MLFLOW_TRACKING_URI") or _default_tracking_uri()
    mlflow.set_tracking_uri(tracking_uri)
    return tracking_uri


def ensure_experiment(name: Optional[str] = None) -> str:
    """Ensure the MLflow experiment exists and return its ID."""
    _ensure_tracking_uri()
    experiment_name = name or _DEFAULT_EXPERIMENT_NAME
    experiment = mlflow.get_experiment_by_name(experiment_name)
    if experiment is None:
        experiment_id = mlflow.create_experiment(experiment_name)
        _LOGGER.info("Created MLflow experiment", extra={"experiment": experiment_name})
        return experiment_id
    return experiment.experiment_id


@contextmanager
def _start_run(run_name: Optional[str] = None, experiment_id: Optional[str] = None, tags: Optional[Dict[str, str]] = None):
    """Context manager that starts and yields an MLflow run."""
    eid = experiment_id or ensure_experiment()
    try:
        with mlflow.start_run(run_name=run_name, experiment_id=eid) as run:
            if tags:
                mlflow.set_tags(tags)
            yield run
    except Exception as exc:  # pragma: no cover - defensive logging
        _LOGGER.exception("Failed to start MLflow run", exc_info=exc)
        raise


def _stringify_params(params: Dict[str, Any]) -> Dict[str, str]:
    result: Dict[str, str] = {}
    for key, value in params.items():
        if value is None:
            continue
        if isinstance(value, (dict, list, tuple)):
            result[key] = json.dumps(value, sort_keys=True)
        else:
            result[key] = str(value)
    return result


def _numeric_metrics(metrics: Dict[str, Any]) -> Dict[str, float]:
    numeric: Dict[str, float] = {}
    for key, value in metrics.items():
        if value is None:
            continue
        try:
            numeric[key] = float(value)
        except (TypeError, ValueError):
            _LOGGER.debug("Skipping non-numeric metric", extra={"key": key, "value": value})
    return numeric


def log_inference_run(
    *,
    model_name: str,
    model_version: Optional[str],
    params: Optional[Dict[str, Any]] = None,
    metrics: Optional[Dict[str, Any]] = None,
    tags: Optional[Dict[str, str]] = None,
    run_name: Optional[str] = None,
) -> Optional[str]:
    """Log an inference event to MLflow and return the run ID."""

    if os.getenv("MLFLOW_DISABLE_RUNTIME_LOGGING", "false").lower() == "true":
        return None

    try:
        experiment_id = ensure_experiment()
        combined_params = {"model_name": model_name, "model_version": model_version or "unknown"}
        if params:
            combined_params.update(params)
        combined_tags = {"engine": "cognitive-targeting", "model_name": model_name}
        if model_version:
            combined_tags["model_version"] = model_version
        if tags:
            combined_tags.update(tags)

        with _start_run(run_name=run_name, experiment_id=experiment_id, tags=combined_tags) as run:
            mlflow.log_params(_stringify_params(combined_params))
            if metrics:
                mlflow.log_metrics(_numeric_metrics(metrics))
            return run.info.run_id
    except Exception as exc:  # pragma: no cover - defensive logging
        _LOGGER.warning("Failed to log inference run", exc_info=exc)
        return None


def register_model_version(
    *,
    registered_name: str,
    hf_model: str,
    hf_revision: Optional[str] = None,
    description: Optional[str] = None,
    extra_params: Optional[Dict[str, Any]] = None,
    extra_tags: Optional[Dict[str, str]] = None,
) -> Tuple[int, str]:
    """Register a Hugging Face model snapshot in MLflow and return ``(version, run_id)``."""

    experiment_id = ensure_experiment()
    params = {
        "hf_model": hf_model,
        "hf_revision": hf_revision or "latest",
    }
    if extra_params:
        params.update(extra_params)

    tags = {"registered_model": registered_name, "hf_model": hf_model}
    if hf_revision:
        tags["hf_revision"] = hf_revision
    if extra_tags:
        tags.update(extra_tags)

    metadata = {
        "hf_model": hf_model,
        "hf_revision": hf_revision,
        "description": description,
        "tags": tags,
    }

    with _start_run(
        run_name=f"register-{registered_name}-{hf_revision or 'latest'}",
        experiment_id=experiment_id,
        tags=tags,
    ) as run:
        mlflow.log_params(_stringify_params(params))
        with tempfile.TemporaryDirectory() as tmp_dir:
            artifact_dir = Path(tmp_dir)
            metadata_path = artifact_dir / "model-metadata.json"
            metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
            mlflow.log_artifacts(str(artifact_dir), artifact_path="model-metadata")
        run_id = run.info.run_id

    client = MlflowClient()
    try:
        client.create_registered_model(registered_name)
    except MlflowException as exc:
        if getattr(exc, "error_code", "") != "RESOURCE_ALREADY_EXISTS" and "RESOURCE_ALREADY_EXISTS" not in str(exc):
            raise

    version = client.create_model_version(
        name=registered_name,
        source=f"{run.info.artifact_uri}/model-metadata",
        run_id=run_id,
        description=description or f"Hugging Face model {hf_model}",
        tags=extra_tags,
    )

    _LOGGER.info(
        "Registered MLflow model version",
        extra={"model": registered_name, "version": version.version, "run_id": run_id},
    )

    return version.version, run_id


__all__ = ["ensure_experiment", "log_inference_run", "register_model_version"]
