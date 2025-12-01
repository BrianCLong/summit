"""Evaluation suite orchestration."""

from __future__ import annotations

import hashlib
import json
import random
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Protocol

from .config import SuiteConfig, TaskConfig
from .metrics import MetricFactory, MetricResult
from .sampling import StratifiedSampler, apply_filters, load_dataset


class ModelAdapter(Protocol):
  """Protocol that model integrations must satisfy."""

  def predict_batch(self, rows: List[Mapping[str, Any]]) -> List[Mapping[str, Any]]:
    ...


@dataclass
class TaskEvaluation:
  task: TaskConfig
  normalized_weight: float
  metrics: Dict[str, MetricResult]
  score: float
  sampled: List[Mapping[str, Any]] = field(default_factory=list)

  def to_dict(self) -> Dict[str, Any]:
    return {
        "task_id": self.task.id,
        "description": self.task.description,
        "weight": self.task.weight,
        "normalized_weight": self.normalized_weight,
        "metrics": {
            name: {
                "value": result.value,
                "sample_size": result.sample_size,
                "stderr": result.stderr,
                "confidence_interval": list(result.confidence_interval()),
            }
            for name, result in self.metrics.items()
        },
        "score": self.score,
    }


@dataclass
class EvaluationResult:
  suite: SuiteConfig
  task_results: List[TaskEvaluation]

  @property
  def overall_score(self) -> float:
    return sum(task.score * task.normalized_weight for task in self.task_results)

  def to_dict(self) -> Dict[str, Any]:
    return {
        "suite": {
            "name": self.suite.name,
            "seed": self.suite.seed,
            "metadata": dict(self.suite.metadata),
        },
        "weights": self.suite.normalized_weights(),
        "overall_score": self.overall_score,
        "tasks": [task.to_dict() for task in self.task_results],
    }

  def to_json(self, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
      json.dump(self.to_dict(), handle, indent=2)

  @staticmethod
  def from_dict(config: SuiteConfig, payload: Mapping[str, Any]) -> "EvaluationResult":
    weights = config.normalized_weights()
    task_results: List[TaskEvaluation] = []
    for task_payload in payload.get("tasks", []):
      task_id = task_payload["task_id"]
      task_config = next(task for task in config.tasks if task.id == task_id)
      metrics: Dict[str, MetricResult] = {}
      for name, metric_payload in task_payload.get("metrics", {}).items():
        metric_result = MetricResult(
            name=name,
            value=float(metric_payload["value"]),
            sample_size=int(metric_payload["sample_size"]),
            stderr=float(metric_payload["stderr"]),
        )
        metrics[name] = metric_result
      task_results.append(
          TaskEvaluation(
              task=task_config,
              normalized_weight=weights[task_config.id],
              metrics=metrics,
              score=float(task_payload.get("score", 0.0)),
          )
      )
    return EvaluationResult(config, task_results)


class EvaluationSuite:
  def __init__(self, config: SuiteConfig) -> None:
    self.config = config

  def run(self, model: ModelAdapter) -> EvaluationResult:
    weights = self.config.normalized_weights()
    rng = random.Random(self.config.seed)
    task_results: List[TaskEvaluation] = []
    for task in self.config.tasks:
      task_seed = self._derive_task_seed(task.id, rng)
      evaluation = self._run_task(task, weights[task.id], task_seed, model)
      task_results.append(evaluation)
    return EvaluationResult(self.config, task_results)

  def _run_task(
      self,
      task: TaskConfig,
      normalized_weight: float,
      task_seed: int,
      model: ModelAdapter,
  ) -> TaskEvaluation:
    dataset_rows = load_dataset(str(task.dataset.path))
    filtered = apply_filters(dataset_rows, task.dataset.filters)
    sampler = StratifiedSampler(task_seed)
    sampled = sampler.sample(filtered, task.dataset.stratify_by, task.dataset.sample_size)
    predictions = model.predict_batch(sampled)
    metric_results = self._compute_metrics(task, predictions, sampled)
    score = self._aggregate_task_score(task, metric_results)
    return TaskEvaluation(task, normalized_weight, metric_results, score, sampled)

  def _compute_metrics(
      self,
      task: TaskConfig,
      predictions: Iterable[Mapping[str, Any]],
      references: Iterable[Mapping[str, Any]],
  ) -> Dict[str, MetricResult]:
    results: Dict[str, MetricResult] = {}
    for metric_config in task.metrics:
      metric = MetricFactory.create(metric_config.name, metric_config.params)
      result = metric.evaluate(predictions, references)
      results[metric.name] = result
    return results

  def _aggregate_task_score(
      self,
      task: TaskConfig,
      metric_results: Mapping[str, MetricResult],
  ) -> float:
    weights = []
    contributions = []
    for metric in task.metrics:
      metric_result = metric_results[metric.name]
      raw_value = metric_result.value
      adjusted = raw_value if metric.goal == "maximize" else 1.0 - raw_value
      metric_weight = float(metric.params.get("weight", 1.0))
      contributions.append(adjusted * metric_weight)
      weights.append(metric_weight)
    total_weight = sum(weights) if weights else 1.0
    return sum(contributions) / total_weight if total_weight else 0.0

  def _derive_task_seed(self, task_id: str, rng: random.Random) -> int:
    digest = hashlib.sha256(f"{task_id}:{rng.random()}".encode("utf-8")).hexdigest()
    return int(digest[:8], 16)
