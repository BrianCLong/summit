import json
import sys
from pathlib import Path

import pytest

pytest.importorskip("tensorflow_federated")

sys.path.append(str(Path(__file__).resolve().parents[1]))

from federated_training import (  # type: ignore[reportMissingImports]
    FederatedTrainingConfig,
    build_keras_model,
    run_federated_training,
    save_metrics,
)


def _write_config(tmp_path: Path, metrics_path: Path, model_path: Path) -> Path:
    config = {
        "jobId": "job-test-1",
        "rounds": 1,
        "batchSize": 2,
        "learningRate": 0.05,
        "modelType": "dense_binary_classifier",
        "clients": [
            {
                "tenantId": "tenant-a",
                "examples": [
                    {"features": [0.0, 0.0], "label": 0},
                    {"features": [0.0, 1.0], "label": 1},
                    {"features": [1.0, 0.0], "label": 1},
                ],
            },
            {
                "tenantId": "tenant-b",
                "examples": [
                    {"features": [1.0, 1.0], "label": 1},
                    {"features": [0.0, 1.0], "label": 0},
                ],
            },
        ],
        "output": {
            "metricsPath": str(metrics_path),
            "modelPath": str(model_path),
        },
    }

    config_path = tmp_path / "config.json"
    config_path.write_text(json.dumps(config))
    return config_path


def test_run_federated_training_produces_metrics(tmp_path: Path) -> None:
    metrics_path = tmp_path / "metrics.json"
    model_path = tmp_path / "model.h5"
    config_path = _write_config(tmp_path, metrics_path, model_path)

    config = FederatedTrainingConfig.from_json(config_path)
    result = run_federated_training(config)

    assert result["jobId"] == "job-test-1"
    assert result["roundsCompleted"] == 1
    assert "loss" in result["globalMetrics"]

    save_metrics(result, metrics_path)

    saved_metrics = json.loads(metrics_path.read_text())
    assert saved_metrics["jobId"] == "job-test-1"
    assert isinstance(result["globalMetrics"], dict)
    assert model_path.exists()


def test_build_model_rejects_unknown_type() -> None:
    with pytest.raises(ValueError):
        build_keras_model(4, model_type="unknown")
