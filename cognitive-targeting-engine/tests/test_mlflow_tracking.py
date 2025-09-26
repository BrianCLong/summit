import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from mlflow.tracking import MlflowClient

from mlflow_tracking import log_inference_run, register_model_version


def _set_local_tracking(tmp_path):
    tracking_dir = tmp_path / "mlruns"
    os.environ["MLFLOW_TRACKING_URI"] = tracking_dir.as_uri()
    os.environ["MLFLOW_EXPERIMENT_NAME"] = "pytest-experiment"
    return tracking_dir


def test_log_inference_run_records_metrics(tmp_path, monkeypatch):
    _set_local_tracking(tmp_path)

    run_id = log_inference_run(
        model_name="test-model",
        model_version="1.0.0",
        params={"threshold": 0.3},
        metrics={"latency_ms": 42.5},
        tags={"suite": "unit"},
        run_name="unit-test",
    )

    assert run_id is not None

    client = MlflowClient()
    run = client.get_run(run_id)
    assert run.data.params["model_name"] == "test-model"
    assert run.data.params["model_version"] == "1.0.0"
    assert run.data.params["threshold"] == "0.3"
    assert run.data.metrics["latency_ms"] == 42.5
    assert run.data.tags["suite"] == "unit"


def test_register_model_version_creates_registry_entry(tmp_path, monkeypatch):
    tracking_dir = _set_local_tracking(tmp_path)

    version, run_id = register_model_version(
        registered_name="hf-emotion-model",
        hf_model="j-hartmann/emotion-english-distilroberta-base",
        hf_revision="abc123",
        description="Unit test version",
        extra_params={"layers": 12},
        extra_tags={"stage": "testing"},
    )

    assert version == 1
    assert run_id

    client = MlflowClient()
    versions = client.search_model_versions("name='hf-emotion-model'")
    assert len(versions) == 1
    mv = versions[0]
    assert mv.run_id == run_id
    assert mv.version == 1
    assert mv.current_stage == "None"

    run_info = client.get_run(run_id).info
    artifact_path = Path(tracking_dir / run_info.experiment_id / run_id / "artifacts" / "model-metadata")
    assert artifact_path.exists()
