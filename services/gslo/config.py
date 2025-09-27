"""Configuration models for the Governance SLO monitor."""

from datetime import timedelta
from pydantic import BaseModel, Field


class SLOThresholds(BaseModel):
    """Target objectives for governance control SLOs."""

    time_to_block_seconds: float = Field(
        120.0,
        description="Maximum acceptable mean seconds between violation detection and block action.",
    )
    false_negative_rate: float = Field(
        0.01,
        description="Maximum tolerated false-negative rate for seeded governance canaries.",
    )
    decision_freshness_seconds: float = Field(
        3600.0,
        description="Maximum acceptable age in seconds of the policy commit applied to a decision.",
    )
    appeal_latency_seconds: float = Field(
        86_400.0,
        description="Maximum acceptable mean seconds to close an appeal on a governance decision.",
    )


class BurnRateConfig(BaseModel):
    """Configuration for burn-rate alerting logic."""

    evaluation_interval: timedelta = Field(
        default=timedelta(seconds=30),
        description="How often to recompute SLO metrics for alerting.",
    )
    alert_window: timedelta = Field(
        default=timedelta(minutes=2),
        description="Window within which burn rate must exceed 1.0 to raise an alert.",
    )
    history_retention: timedelta = Field(
        default=timedelta(hours=6),
        description="Duration for which time-series metric snapshots are retained for dashboards.",
    )


DEFAULT_THRESHOLDS = SLOThresholds()
DEFAULT_BURN_RATE = BurnRateConfig()
