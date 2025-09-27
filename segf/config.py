"""Configuration objects for the Synthetic Entity Graph Forge (SEGF)."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Dict, List, Optional


@dataclass
class PopulationConfig:
    """High level controls for the entity population."""

    n_users: int = 5_000
    n_merchants: int = 350
    avg_devices_per_user: float = 1.6
    avg_merchants_per_user: float = 3.2
    fraud_user_ratio: float = 0.08


@dataclass
class LifecycleConfig:
    """Controls for lifecycle timing measured in days from an anchor date."""

    horizon_days: int = 90
    signup_window_days: int = 14
    mean_active_span_days: float = 45.0
    std_active_span_days: float = 12.0
    churn_reactivation_probability: float = 0.1


@dataclass
class EventConfig:
    """Controls for transactional activity."""

    daily_txn_rate_legit: float = 0.35
    daily_txn_rate_fraud: float = 0.55
    chargeback_prob_legit: float = 0.01
    chargeback_prob_fraud: float = 0.35
    base_amount: float = 82.0
    amount_std: float = 18.0


@dataclass
class FraudRingConfig:
    """Configuration for optional fraud ring motifs."""

    enabled: bool = True
    ring_count: int = 6
    min_ring_size: int = 3
    max_ring_size: int = 10
    shared_device_ratio: float = 0.65
    shared_merchant_ratio: float = 0.55


@dataclass
class DriftScenario:
    """Represents a concept-drift window where behaviour deviates from baseline."""

    name: str
    start_day: int
    end_day: int
    fraud_multiplier: float = 1.2
    legit_multiplier: float = 0.8
    chargeback_multiplier: float = 1.5
    description: str = ""

    def to_range(self) -> range:
        return range(self.start_day, self.end_day + 1)


@dataclass
class TargetStats:
    """Target statistics for validating generated corpora."""

    expected_user_fraud_ratio: float
    expected_chargeback_rate: float
    expected_daily_transactions: float
    drift_windows: Dict[str, Dict[str, float]] = field(default_factory=dict)
    tolerance: float = 0.05


@dataclass
class SegfConfig:
    """Primary configuration bundle for generation runs."""

    population: PopulationConfig = field(default_factory=PopulationConfig)
    lifecycle: LifecycleConfig = field(default_factory=LifecycleConfig)
    events: EventConfig = field(default_factory=EventConfig)
    fraud_rings: FraudRingConfig = field(default_factory=FraudRingConfig)
    drift_scenarios: List[DriftScenario] = field(default_factory=list)
    anchor_date: date = field(default_factory=date.today)
    metadata: Dict[str, str] = field(default_factory=dict)
    random_seed: Optional[int] = 7


__all__ = [
    "PopulationConfig",
    "LifecycleConfig",
    "EventConfig",
    "FraudRingConfig",
    "DriftScenario",
    "TargetStats",
    "SegfConfig",
]
