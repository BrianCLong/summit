"""Moat pipeline configuration loader.

This module centralises parsing of the Moat pipeline
configuration so runners can switch between pipeline
variants (v1, v1b, etc.) without hard-coding behaviour.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional

import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG_PATH = PROJECT_ROOT / "config" / "moat.yaml"


@dataclass
class MoatConfig:
    """Configuration for Moat pipeline variants and metrics.

    Attributes:
        pipeline_name: Name of the pipeline managed by this config.
        default_version: Version to run when no override is provided.
        baseline_version: Version used for comparative baselines.
        versions: Allowed version identifiers.
        metrics_store: Location for shared metrics storage.
        comparative_metrics: Metric keys to calculate deltas for.
    """

    pipeline_name: str = "moat-evaluation"
    default_version: str = "v1"
    baseline_version: str = "v1"
    versions: list[str] = field(default_factory=lambda: ["v1", "v1b"])
    metrics_store: Path = field(default_factory=lambda: PROJECT_ROOT / "pipelines" / "demo" / "moat-metrics.json")
    comparative_metrics: list[str] = field(default_factory=lambda: ["duration_ms", "task_success_rate"])

    @classmethod
    def load(cls, path: Optional[Path] = None) -> Optional["MoatConfig"]:
        """Load Moat configuration from YAML.

        Returns None when the config file cannot be found, so callers can
        opt into instrumentation only when configured.
        """

        config_path = Path(path) if path else DEFAULT_CONFIG_PATH
        if not config_path.exists():
            return None

        with open(config_path) as f:
            raw = yaml.safe_load(f) or {}

        return cls(
            pipeline_name=raw.get("pipeline", cls.pipeline_name),
            default_version=raw.get("default_version", cls.default_version),
            baseline_version=raw.get("baseline_version", raw.get("default_version", cls.baseline_version)),
            versions=list(raw.get("versions", cls.versions)),
            metrics_store=Path(raw.get("metrics_store", PROJECT_ROOT / "pipelines" / "demo" / "moat-metrics.json")),
            comparative_metrics=list(raw.get("comparative_metrics", cls.comparative_metrics)),
        )

    def is_managed_pipeline(self, pipeline_name: str) -> bool:
        """Return True when the config should apply to the pipeline."""

        return pipeline_name == self.pipeline_name

    def resolve_version(self, requested: Optional[str]) -> str:
        """Return the version that should run for this pipeline."""

        if requested and requested in self.versions:
            return requested
        return self.default_version

    def to_dict(self) -> Dict[str, Any]:
        """Serialise config for logging or debugging."""

        return {
            "pipeline": self.pipeline_name,
            "default_version": self.default_version,
            "baseline_version": self.baseline_version,
            "versions": self.versions,
            "metrics_store": str(self.metrics_store),
            "comparative_metrics": self.comparative_metrics,
        }
