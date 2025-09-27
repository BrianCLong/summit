"""Comparison utilities for REO model versions."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Dict, List

from scipy.stats import norm

from .metrics import MetricResult
from .suite import EvaluationResult


@dataclass
class MetricDelta:
  metric: str
  goal: str
  baseline: MetricResult
  candidate: MetricResult
  delta: float
  stderr: float
  ci_low: float
  ci_high: float
  is_regression: bool


@dataclass
class TaskDelta:
  task_id: str
  score_delta: float
  metric_deltas: List[MetricDelta]


@dataclass
class ComparisonReport:
  baseline_version: str
  candidate_version: str
  overall_delta: float
  task_deltas: List[TaskDelta]

  @staticmethod
  def from_results(
      baseline: EvaluationResult,
      candidate: EvaluationResult,
      baseline_version: str,
      candidate_version: str,
  ) -> "ComparisonReport":
    task_deltas: List[TaskDelta] = []
    baseline_tasks = {task.task.id: task for task in baseline.task_results}
    candidate_tasks = {task.task.id: task for task in candidate.task_results}
    for task_id, candidate_task in candidate_tasks.items():
      base_task = baseline_tasks.get(task_id)
      if base_task is None:
        continue
      metric_deltas = []
      metric_goals = {metric.name: metric.goal for metric in candidate_task.task.metrics}
      for metric_name, cand_metric in candidate_task.metrics.items():
        base_metric = base_task.metrics.get(metric_name)
        if base_metric is None:
          continue
        delta = cand_metric.value - base_metric.value
        stderr = math.sqrt(cand_metric.stderr**2 + base_metric.stderr**2)
        z = norm.ppf(0.5 + 0.95 / 2.0)
        ci_low = delta - z * stderr
        ci_high = delta + z * stderr
        goal = metric_goals.get(metric_name, "maximize")
        is_regression = False
        if goal == "maximize":
          is_regression = ci_high < 0
        else:
          is_regression = ci_low > 0
        metric_deltas.append(
            MetricDelta(
                metric=metric_name,
                goal=goal,
                baseline=base_metric,
                candidate=cand_metric,
                delta=delta,
                stderr=stderr,
                ci_low=ci_low,
                ci_high=ci_high,
                is_regression=is_regression,
            )
        )
      score_delta = candidate_task.score - base_task.score
      task_deltas.append(TaskDelta(task_id, score_delta, metric_deltas))
    overall_delta = candidate.overall_score - baseline.overall_score
    return ComparisonReport(
        baseline_version=baseline_version,
        candidate_version=candidate_version,
        overall_delta=overall_delta,
        task_deltas=task_deltas,
    )

  def regressions(self) -> Dict[str, List[MetricDelta]]:
    summary: Dict[str, List[MetricDelta]] = {}
    for task_delta in self.task_deltas:
      flagged = [metric for metric in task_delta.metric_deltas if metric.is_regression]
      if flagged:
        summary[task_delta.task_id] = flagged
    return summary
