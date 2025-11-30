from __future__ import annotations

import json
import random
import time
from collections.abc import Callable, Iterable, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


DEFAULT_REGISTRY_PATH = (
    Path(__file__).resolve().parent.parent / "performance" / "model_registry.json"
)


@dataclass(frozen=True)
class ModelVersion:
    name: str
    version: str
    hyperparameters: dict[str, Any]
    metrics: dict[str, float]
    created_at: float = field(default_factory=lambda: time.time())
    status: str = "candidate"


@dataclass(frozen=True)
class TrialResult:
    hyperparameters: dict[str, Any]
    metrics: dict[str, float]


class ModelRegistry:
    """Lightweight JSON-backed registry for model versioning and deployment state."""

    def __init__(self, registry_path: str | Path | None = None) -> None:
        self.registry_path = Path(registry_path or DEFAULT_REGISTRY_PATH)
        self.registry_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.registry_path.exists():
            self.registry_path.write_text(json.dumps({"models": {}}, indent=2))

    def _load(self) -> dict[str, Any]:
        return json.loads(self.registry_path.read_text())

    def _save(self, data: dict[str, Any]) -> None:
        self.registry_path.write_text(json.dumps(data, indent=2))

    def next_version(self, model_name: str) -> str:
        models = self._load().get("models", {})
        existing = models.get(model_name, [])
        return str(len(existing) + 1)

    def record(self, model: ModelVersion) -> None:
        data = self._load()
        models = data.setdefault("models", {})
        versions = models.setdefault(model.name, [])
        versions.append(
            {
                "version": model.version,
                "hyperparameters": model.hyperparameters,
                "metrics": model.metrics,
                "created_at": model.created_at,
                "status": model.status,
            }
        )
        self._save(data)

    def latest(self, model_name: str) -> ModelVersion | None:
        models = self._load().get("models", {})
        versions = models.get(model_name, [])
        if not versions:
            return None
        latest_version = versions[-1]
        return ModelVersion(
            name=model_name,
            version=str(latest_version["version"]),
            hyperparameters=latest_version.get("hyperparameters", {}),
            metrics=latest_version.get("metrics", {}),
            created_at=latest_version.get("created_at", time.time()),
            status=latest_version.get("status", "candidate"),
        )

    def production(self, model_name: str) -> ModelVersion | None:
        models = self._load().get("models", {})
        versions = models.get(model_name, [])
        for version in reversed(versions):
            if version.get("status") == "production":
                return ModelVersion(
                    name=model_name,
                    version=str(version["version"]),
                    hyperparameters=version.get("hyperparameters", {}),
                    metrics=version.get("metrics", {}),
                    created_at=version.get("created_at", time.time()),
                    status=version.get("status", "candidate"),
                )
        return None

    def promote(self, model: ModelVersion) -> ModelVersion:
        promoted = ModelVersion(
            name=model.name,
            version=model.version,
            hyperparameters=model.hyperparameters,
            metrics=model.metrics,
            created_at=model.created_at,
            status="production",
        )
        self.record(promoted)
        return promoted


class HyperparameterOptimizer:
    def __init__(
        self,
        evaluation_fn: Callable[[dict[str, Any]], dict[str, float]],
        *,
        target_metric: str = "accuracy",
        maximize: bool = True,
    ) -> None:
        self.evaluation_fn = evaluation_fn
        self.target_metric = target_metric
        self.maximize = maximize

    def random_search(
        self, param_space: dict[str, Sequence[Any]], *, num_trials: int = 10
    ) -> tuple[dict[str, Any], list[TrialResult]]:
        trials: list[TrialResult] = []
        for _ in range(num_trials):
            sample = {key: random.choice(values) for key, values in param_space.items()}
            metrics = self.evaluation_fn(sample)
            trials.append(TrialResult(hyperparameters=sample, metrics=metrics))

        if not trials:
            raise ValueError("At least one trial is required for hyperparameter search")

        best = trials[0]
        for trial in trials[1:]:
            current_metric = trial.metrics.get(self.target_metric, 0)
            best_metric = best.metrics.get(self.target_metric, 0)
            if self.maximize and current_metric > best_metric:
                best = trial
            elif not self.maximize and current_metric < best_metric:
                best = trial
        return best.hyperparameters, trials


@dataclass(frozen=True)
class ABTestResult:
    control_metrics: dict[str, float]
    treatment_metrics: dict[str, float]
    lift: float
    winner: str


class ABTestRunner:
    def __init__(
        self,
        evaluation_fn: Callable[[dict[str, Any], Sequence[Any]], dict[str, float]],
        *,
        target_metric: str = "accuracy",
        maximize: bool = True,
    ) -> None:
        self.evaluation_fn = evaluation_fn
        self.target_metric = target_metric
        self.maximize = maximize

    def run(
        self,
        control: ModelVersion,
        treatment: ModelVersion,
        dataset: Sequence[Any],
        *,
        traffic_split: float = 0.5,
    ) -> ABTestResult:
        split_index = max(1, int(len(dataset) * traffic_split))
        control_data = dataset[:split_index]
        treatment_data = dataset[split_index:] or dataset

        control_metrics = self.evaluation_fn(control.hyperparameters, control_data)
        treatment_metrics = self.evaluation_fn(
            treatment.hyperparameters, treatment_data
        )

        control_value = control_metrics.get(self.target_metric, 0)
        treatment_value = treatment_metrics.get(self.target_metric, 0)
        if control_value == 0:
            lift = float("inf") if treatment_value > 0 else 0.0
        else:
            lift = (treatment_value - control_value) / control_value

        winner = treatment.name if self.maximize and lift > 0 else control.name
        if not self.maximize and lift < 0:
            winner = treatment.name

        return ABTestResult(
            control_metrics=control_metrics,
            treatment_metrics=treatment_metrics,
            lift=lift,
            winner=winner,
        )


@dataclass(frozen=True)
class RegressionReport:
    regressions: dict[str, float]
    is_regression: bool


class RegressionDetector:
    def __init__(self, tolerances: dict[str, float] | None = None) -> None:
        self.tolerances = tolerances or {"latency_ms": 0.05, "cost": 0.05}

    def detect(
        self, baseline_metrics: dict[str, float], candidate_metrics: dict[str, float]
    ) -> RegressionReport:
        regressions: dict[str, float] = {}
        for metric, tolerance in self.tolerances.items():
            baseline_value = baseline_metrics.get(metric)
            candidate_value = candidate_metrics.get(metric)
            if baseline_value is None or candidate_value is None:
                continue
            if candidate_value > baseline_value * (1 + tolerance):
                regressions[metric] = candidate_value - baseline_value
        return RegressionReport(regressions=regressions, is_regression=bool(regressions))


@dataclass(frozen=True)
class DeploymentDecision:
    deployed: bool
    reason: str
    deployed_version: ModelVersion | None


class DeploymentManager:
    def __init__(
        self,
        registry: ModelRegistry,
        *,
        target_metric: str = "accuracy",
        maximize: bool = True,
        min_relative_improvement: float = 0.01,
    ) -> None:
        self.registry = registry
        self.target_metric = target_metric
        self.maximize = maximize
        self.min_relative_improvement = min_relative_improvement

    def maybe_deploy(
        self,
        candidate: ModelVersion,
        baseline: ModelVersion | None,
        regression_report: RegressionReport | None,
    ) -> DeploymentDecision:
        if regression_report and regression_report.is_regression:
            return DeploymentDecision(
                deployed=False,
                reason=f"Regressions detected: {sorted(regression_report.regressions)}",
                deployed_version=None,
            )

        if baseline is None:
            deployed = self.registry.promote(candidate)
            return DeploymentDecision(
                deployed=True, reason="No baseline — deploying first model", deployed_version=deployed
            )

        candidate_metric = candidate.metrics.get(self.target_metric, 0)
        baseline_metric = baseline.metrics.get(self.target_metric, 0)
        if baseline_metric == 0:
            improvement = float("inf") if candidate_metric > 0 else 0.0
        else:
            improvement = (candidate_metric - baseline_metric) / baseline_metric

        if (self.maximize and improvement >= self.min_relative_improvement) or (
            not self.maximize and improvement <= -self.min_relative_improvement
        ):
            deployed = self.registry.promote(candidate)
            return DeploymentDecision(
                deployed=True,
                reason=f"Improved {self.target_metric} by {improvement:.2%}",
                deployed_version=deployed,
            )

        return DeploymentDecision(
            deployed=False,
            reason=f"No significant {self.target_metric} improvement",
            deployed_version=None,
        )


@dataclass(frozen=True)
class BenchmarkingSummary:
    candidate: ModelVersion
    trials: list[TrialResult]
    ab_test: ABTestResult | None
    regression_report: RegressionReport | None
    deployment: DeploymentDecision


class ModelBenchmarkingSuite:
    """End-to-end model benchmarking, A/B validation, and automated deployment."""

    def __init__(
        self,
        evaluation_fn: Callable[[dict[str, Any], Sequence[Any]], dict[str, float]],
        *,
        registry_path: str | Path | None = None,
        target_metric: str = "accuracy",
        maximize: bool = True,
        tolerances: dict[str, float] | None = None,
        min_relative_improvement: float = 0.01,
    ) -> None:
        self.evaluate_fn = evaluation_fn
        self.registry = ModelRegistry(registry_path)
        self.target_metric = target_metric
        self.maximize = maximize
        self.tolerances = tolerances
        self.min_relative_improvement = min_relative_improvement

    def run(
        self,
        model_name: str,
        param_space: dict[str, Sequence[Any]],
        dataset: Sequence[Any],
        *,
        num_trials: int = 10,
        traffic_split: float = 0.5,
    ) -> BenchmarkingSummary:
        baseline = self.registry.production(model_name)

        optimizer = HyperparameterOptimizer(
            lambda params: self.evaluate_fn(params, dataset),
            target_metric=self.target_metric,
            maximize=self.maximize,
        )
        best_params, trials = optimizer.random_search(param_space, num_trials=num_trials)

        candidate_metrics = self.evaluate_fn(best_params, dataset)
        candidate_version = self.registry.next_version(model_name)
        candidate = ModelVersion(
            name=model_name,
            version=candidate_version,
            hyperparameters=best_params,
            metrics=candidate_metrics,
            status="candidate",
        )
        self.registry.record(candidate)

        ab_result = None
        regression_report = None
        if baseline:
            ab_result = ABTestRunner(
                self.evaluate_fn, target_metric=self.target_metric, maximize=self.maximize
            ).run(baseline, candidate, dataset, traffic_split=traffic_split)
            regression_report = RegressionDetector(tolerances=self.tolerances).detect(
                baseline.metrics, candidate.metrics
            )

        decision = DeploymentManager(
            registry=self.registry,
            target_metric=self.target_metric,
            maximize=self.maximize,
            min_relative_improvement=self.min_relative_improvement,
        ).maybe_deploy(candidate, baseline, regression_report)

        return BenchmarkingSummary(
            candidate=candidate,
            trials=trials,
            ab_test=ab_result,
            regression_report=regression_report,
            deployment=decision,
        )
