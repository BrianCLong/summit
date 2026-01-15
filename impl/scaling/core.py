"""Core domain models for the Scaling & AutoML orchestrator v0.1.

These dataclasses mirror the JSON Schemas in ``impl/scaling/schemas`` to provide
lightweight, typed structures that can be used by ingestion, fitting, and
planning components. Validation is intentionally minimal and schema-driven so
that changes to the JSON Schemas propagate through the stack.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field


@dataclass
class Config:
    """Model, data, and runtime configuration knobs for an experiment."""

    model_family: str
    parameters: float
    depth: int | None = None
    width: int | None = None
    context_length: int | None = None
    moe: bool = False
    data_mix: dict[str, float] = field(default_factory=dict)
    learning_rate: float | None = None
    lr_schedule: str | None = None
    curriculum: bool = False
    runtime: dict[str, str] = field(default_factory=dict)


@dataclass
class Metrics:
    """Captured metrics from a training/evaluation run."""

    training_loss: float | None = None
    reasoning_score: float | None = None
    tool_success_rate: float | None = None
    safety_score: float | None = None
    hallucination_rate: float | None = None
    latency_p95_ms: float | None = None
    tokens_processed: float | None = None
    flops: float | None = None


@dataclass
class Experiment:
    """A normalized experiment record combining configuration and metrics."""

    id: str
    config: Config
    metrics: Metrics
    hardware: dict[str, str] = field(default_factory=dict)
    budget: dict[str, float] = field(default_factory=dict)
    tags: Sequence[str] = field(default_factory=tuple)


@dataclass
class Recommendation:
    """Planner output capturing proposed next experiment and expectations."""

    config: Config
    predicted_metrics: Metrics
    expected_utility: float
    rationale: str
    constraints: dict[str, float] = field(default_factory=dict)
    candidate_pool: list[Config] = field(default_factory=list)
