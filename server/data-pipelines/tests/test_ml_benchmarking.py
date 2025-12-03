import json
import tempfile
from pathlib import Path

import importlib.util
import sys

OPTIMIZATION_DIR = Path(__file__).resolve().parents[1] / "optimization"
spec = importlib.util.spec_from_file_location("ml_benchmarking", OPTIMIZATION_DIR / "ml_benchmarking.py")
module = importlib.util.module_from_spec(spec)
sys.modules["ml_benchmarking"] = module
assert spec.loader is not None
spec.loader.exec_module(module)

ModelBenchmarkingSuite = module.ModelBenchmarkingSuite
ModelRegistry = module.ModelRegistry
ModelVersion = module.ModelVersion
RegressionDetector = module.RegressionDetector


def fake_evaluator(params, dataset):
    # Accuracy improves when learning_rate is higher; latency grows with depth
    accuracy = params.get("learning_rate", 0) * 0.5 + params.get("momentum", 0)
    latency_ms = params.get("depth", 1) * 10
    cost = params.get("regularization", 0) * 0.1
    # Each data point contributes a small bonus
    accuracy += len(dataset) * 0.01
    return {"accuracy": accuracy, "latency_ms": latency_ms, "cost": cost}


def test_hyperparameter_optimization_and_ab_deploys_best_model(tmp_path: Path):
    registry_path = tmp_path / "registry.json"
    dataset = list(range(20))

    suite = ModelBenchmarkingSuite(
        fake_evaluator,
        registry_path=registry_path,
        target_metric="accuracy",
        maximize=True,
        min_relative_improvement=0.05,
    )

    param_space = {
        "learning_rate": [0.1, 0.2, 0.5],
        "momentum": [0.0, 0.1],
        "depth": [1, 2],
        "regularization": [0.01, 0.1],
    }

    summary = suite.run("demo-model", param_space, dataset, num_trials=6, traffic_split=0.5)

    assert summary.candidate.metrics["accuracy"] > 0
    assert summary.deployment.deployed is True
    assert summary.deployment.deployed_version is not None
    assert summary.deployment.deployed_version.status == "production"

    registry_data = json.loads(registry_path.read_text())
    assert registry_data["models"]["demo-model"][-1]["status"] == "production"


def test_regression_detection_blocks_deployment(tmp_path: Path):
    registry_path = tmp_path / "registry.json"
    registry = ModelRegistry(registry_path)

    baseline = ModelVersion(
        name="demo-model",
        version="1",
        hyperparameters={"learning_rate": 0.3},
        metrics={"accuracy": 0.8, "latency_ms": 50, "cost": 1.0},
        status="production",
    )
    registry.record(baseline)

    detector = RegressionDetector(tolerances={"latency_ms": 0.01, "cost": 0.01})
    report = detector.detect(baseline.metrics, {"accuracy": 0.82, "latency_ms": 60, "cost": 1.2})
    assert report.is_regression
    assert "latency_ms" in report.regressions and "cost" in report.regressions

    # Ensure deployment manager respects regression report
    suite = ModelBenchmarkingSuite(
        fake_evaluator,
        registry_path=registry_path,
        target_metric="accuracy",
        maximize=True,
        min_relative_improvement=0.01,
    )
    summary = suite.run(
        "demo-model",
        {
            "learning_rate": [0.1],
            "momentum": [0.1],
            "depth": [10],
            "regularization": [20],
        },
        dataset=[1, 2, 3],
        num_trials=1,
        traffic_split=0.5,
    )

    assert summary.regression_report is not None
    assert summary.deployment.deployed is False
    assert summary.deployment.reason.startswith("Regressions detected")
