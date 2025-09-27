"""Data models for the Governance SLO monitor service."""

from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class ViolationEvent(BaseModel):
    """Represents the detection of a policy violation."""

    violation_id: str = Field(..., description="Unique identifier for the detected violation.")
    detected_at: datetime = Field(
        default_factory=lambda: datetime.utcnow(),
        description="Timestamp when the violation was detected.",
    )
    control: Optional[str] = Field(
        default=None,
        description="Governance control or policy guardrail that triggered the violation.",
    )


class BlockEvent(BaseModel):
    """Represents the enforcement action taken to block a violation."""

    violation_id: str = Field(..., description="Identifier correlating to the detected violation.")
    blocked_at: datetime = Field(
        default_factory=lambda: datetime.utcnow(),
        description="Timestamp when the block action was executed.",
    )
    control: Optional[str] = Field(default=None, description="Control executing the block action.")
    reason: Optional[str] = Field(default=None, description="Optional free-form reason for the block.")


class CanaryEvent(BaseModel):
    """Represents a seeded canary used to detect false negatives."""

    canary_id: str = Field(..., description="Identifier for the seeded canary event.")
    violation_id: str = Field(..., description="Synthetic violation identifier tied to the canary.")
    injected_at: datetime = Field(
        default_factory=lambda: datetime.utcnow(),
        description="Timestamp when the canary violation was injected.",
    )
    blocked: bool = Field(
        default=False,
        description="Whether the canary violation was successfully blocked by the governance plane.",
    )
    blocked_at: Optional[datetime] = Field(
        default=None,
        description="Timestamp when the canary was blocked, if applicable.",
    )


class PolicyCommit(BaseModel):
    """Represents the policy commit used for a governance decision."""

    commit_sha: str = Field(..., description="Git commit SHA for the policy snapshot.")
    published_at: datetime = Field(
        default_factory=lambda: datetime.utcnow(),
        description="Time when the policy commit was published to governance controls.",
    )


class DecisionEvent(BaseModel):
    """Represents a governance decision made under a specific policy commit."""

    decision_id: str = Field(..., description="Identifier for the recorded decision.")
    policy_sha: str = Field(..., description="Commit SHA the decision evaluated against.")
    decided_at: datetime = Field(
        default_factory=lambda: datetime.utcnow(),
        description="Timestamp when the decision occurred.",
    )


class AppealEvent(BaseModel):
    """Represents the lifecycle of an appeal on a governance decision."""

    appeal_id: str = Field(..., description="Unique identifier for the appeal.")
    decision_id: str = Field(..., description="Decision associated with the appeal.")
    filed_at: datetime = Field(
        default_factory=lambda: datetime.utcnow(),
        description="Timestamp when the appeal was filed.",
    )
    resolved_at: Optional[datetime] = Field(
        default=None,
        description="Timestamp when the appeal received a final decision.",
    )
    outcome: Optional[str] = Field(default=None, description="Outcome of the appeal.")


class TimeseriesPoint(BaseModel):
    """Single point for a time-series metric."""

    ts: datetime
    value: float


class SLOSnapshot(BaseModel):
    """Snapshot of current SLO performance metrics."""

    collected_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    time_to_block_seconds: float
    false_negative_rate: float
    decision_freshness_seconds: float
    appeal_latency_seconds: float


class BurnRateAlert(BaseModel):
    """Represents an active burn-rate alert for a specific SLO."""

    slo_name: str
    burn_rate: float
    triggered_at: datetime
    details: Dict[str, str] = Field(default_factory=dict)


class DashboardPayload(BaseModel):
    """Response model for the dashboard endpoint."""

    snapshot: SLOSnapshot
    history: Dict[str, List[TimeseriesPoint]]
    alerts: List[BurnRateAlert]


class SyntheticSchedule(BaseModel):
    """Configuration for the synthetic traffic generator."""

    violation_interval_seconds: float = 15.0
    canary_interval_seconds: float = 45.0
    appeal_interval_seconds: float = 60.0
    policy_refresh_interval_seconds: float = 90.0
