"""Configuration utilities for REO suites."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional

import yaml


@dataclass(frozen=True)
class StratifiedDataset:
  """Dataset configuration with stratification instructions."""

  path: Path
  stratify_by: str
  sample_size: Optional[int] = None
  filters: Mapping[str, Any] | None = None

  @staticmethod
  def from_dict(data: Mapping[str, Any], base_path: Path | None = None) -> "StratifiedDataset":
    if "path" not in data or "stratify_by" not in data:
      raise ValueError("Dataset configuration must include 'path' and 'stratify_by'.")
    dataset_path = Path(data["path"])
    if base_path and not dataset_path.is_absolute():
      dataset_path = base_path / dataset_path
    return StratifiedDataset(
        path=dataset_path,
        stratify_by=str(data["stratify_by"]),
        sample_size=int(data["sample_size"]) if data.get("sample_size") is not None else None,
        filters=data.get("filters"),
    )


@dataclass(frozen=True)
class MetricConfig:
  """Metric definition to apply within a task."""

  name: str
  goal: str = "maximize"
  params: Mapping[str, Any] = field(default_factory=dict)

  @staticmethod
  def from_dict(data: Mapping[str, Any]) -> "MetricConfig":
    if "name" not in data:
      raise ValueError("Metric configuration requires a 'name'.")
    return MetricConfig(
        name=str(data["name"]),
        goal=str(data.get("goal", "maximize")),
        params=data.get("params", {}),
    )


@dataclass(frozen=True)
class TaskConfig:
  """Configuration for an individual evaluation task."""

  id: str
  description: str
  weight: float
  dataset: StratifiedDataset
  metrics: List[MetricConfig]
  tags: Iterable[str] = field(default_factory=list)

  @staticmethod
  def from_dict(data: Mapping[str, Any], base_path: Path | None = None) -> "TaskConfig":
    required = {"id", "description", "weight", "dataset", "metrics"}
    missing = required - data.keys()
    if missing:
      raise ValueError(f"Task configuration missing required fields: {missing}")
    metrics = [MetricConfig.from_dict(m) for m in data["metrics"]]
    return TaskConfig(
        id=str(data["id"]),
        description=str(data["description"]),
        weight=float(data["weight"]),
        dataset=StratifiedDataset.from_dict(data["dataset"], base_path=base_path),
        metrics=metrics,
        tags=tuple(data.get("tags", [])),
    )


@dataclass(frozen=True)
class SuiteConfig:
  """Top-level suite configuration."""

  name: str
  seed: int
  tasks: List[TaskConfig]
  metadata: Mapping[str, Any] = field(default_factory=dict)

  @staticmethod
  def from_yaml(path: Path | str) -> "SuiteConfig":
    with open(path, "r", encoding="utf-8") as handle:
      payload = yaml.safe_load(handle)
    base_path = Path(path).parent
    return SuiteConfig.from_dict(payload, base_path=base_path)

  @staticmethod
  def from_dict(data: Mapping[str, Any], base_path: Path | None = None) -> "SuiteConfig":
    if "tasks" not in data:
      raise ValueError("Suite configuration must define tasks.")
    seed = int(data.get("seed", 0))
    tasks = [TaskConfig.from_dict(task, base_path=base_path) for task in data["tasks"]]
    return SuiteConfig(
        name=str(data.get("name", "unnamed-suite")),
        seed=seed,
        tasks=tasks,
        metadata=data.get("metadata", {}),
    )

  def total_weight(self) -> float:
    return sum(task.weight for task in self.tasks)

  def normalized_weights(self) -> Dict[str, float]:
    total = self.total_weight()
    if total <= 0:
      raise ValueError("Total task weight must be positive.")
    return {task.id: task.weight / total for task in self.tasks}
