"""Core domain models for the Scaling & AutoML orchestrator v0.1.

These dataclasses mirror the JSON Schemas in ``impl/scaling/schemas`` to provide
lightweight, typed structures that can be used by ingestion, fitting, and
planning components. Validation is intentionally minimal and schema-driven so
that changes to the JSON Schemas propagate through the stack.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence


@dataclass
class Config:
    """Model, data, and runtime configuration knobs for an experiment."""

    model_family: str
    parameters: float
    depth: Optional[int] = None
    width: Optional[int] = None
    context_length: Optional[int] = None
    moe: bool = False
    data_mix: Dict[str, float] = field(default_factory=dict)
    learning_rate: Optional[float] = None
    lr_schedule: Optional[str] = None
    curriculum: bool = False
    runtime: Dict[str, str] = field(default_factory=dict)


@dataclass
class Metrics:
    """Captured metrics from a training/evaluation run."""

    training_loss: Optional[float] = None
    reasoning_score: Optional[float] = None
    tool_success_rate: Optional[float] = None
    safety_score: Optional[float] = None
    hallucination_rate: Optional[float] = None
    latency_p95_ms: Optional[float] = None
    tokens_processed: Optional[float] = None
    flops: Optional[float] = None


@dataclass
class Experiment:
    """A normalized experiment record combining configuration and metrics."""

    id: str
    config: Config
    metrics: Metrics
    hardware: Dict[str, str] = field(default_factory=dict)
    budget: Dict[str, float] = field(default_factory=dict)
    tags: Sequence[str] = field(default_factory=tuple)


@dataclass
class Recommendation:
    """Planner output capturing proposed next experiment and expectations."""

    config: Config
    predicted_metrics: Metrics
    expected_utility: float
    rationale: str
    constraints: Dict[str, float] = field(default_factory=dict)
    candidate_pool: List[Config] = field(default_factory=list)
