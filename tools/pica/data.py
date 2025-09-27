"""Core data structures for the Policy Impact Causal Analyzer (PICA).

These dataclasses provide a lightweight schema for representing rollout
manifests, KPI observations, and downstream analysis artefacts. They are
intentionally minimal so that the toolkit can ingest a variety of upstream
sources (BGPR, OSRP, custom pipelines) without imposing strict
serialization requirements.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Iterable, List, Mapping, Optional, Sequence


class PolicyAction(str, Enum):
    """Enumerates the supported policy actions captured in rollout manifests."""

    ALLOW = "allow"
    DENY = "deny"
    REDACT = "redact"


class ManifestSource(str, Enum):
    """Describes the origin of a rollout manifest."""

    BGPR = "BGPR"
    OSRP = "OSRP"
    UNKNOWN = "unknown"


class RolloutPhase(str, Enum):
    """Marks whether an observation belongs to the pre- or post-policy window."""

    PRE = "pre"
    POST = "post"


@dataclass(frozen=True)
class RolloutManifest:
    """Metadata that uniquely identifies a policy rollout."""

    policy_id: str
    action: PolicyAction
    source: ManifestSource
    start_time: datetime
    end_time: datetime
    description: Optional[str] = None


@dataclass(frozen=True)
class KPIObservation:
    """A single KPI or governance metric snapshot for a unit and time."""

    unit: str
    timestamp: datetime
    phase: RolloutPhase
    is_treated: bool
    kpi_values: Mapping[str, float]
    governance_metrics: Mapping[str, float] = field(default_factory=dict)
    weight: float = 1.0

    def value_for(self, metric: str) -> float:
        try:
            return float(self.kpi_values[metric])
        except KeyError as exc:  # pragma: no cover - defensive
            raise KeyError(f"Metric '{metric}' missing from observation for unit {self.unit}") from exc


@dataclass(frozen=True)
class ConfidenceInterval:
    """Simple representation of a confidence interval."""

    lower: float
    upper: float

    def width(self) -> float:
        return self.upper - self.lower


@dataclass(frozen=True)
class SensitivityResult:
    """Stores confidence interval adjustments for a given sensitivity toggle."""

    name: str
    interval: ConfidenceInterval
    multiplier: float


@dataclass(frozen=True)
class ImpactEstimate:
    """Stores the outcome of a single estimator for a specific KPI."""

    method: str
    metric: str
    estimate: float
    interval: ConfidenceInterval
    details: Mapping[str, float]
    sensitivity: Sequence[SensitivityResult] = field(default_factory=tuple)


@dataclass(frozen=True)
class ImpactBrief:
    """Human-readable summary of the policy impact analysis."""

    manifest: RolloutManifest
    estimates: Sequence[ImpactEstimate]
    governance_notes: Mapping[str, float] = field(default_factory=dict)

    def render(self) -> str:
        """Render a deterministic signed brief covering all estimators."""

        header = (
            f"Policy Impact Brief\n"
            f"Policy: {self.manifest.policy_id}\n"
            f"Action: {self.manifest.action.value}\n"
            f"Source: {self.manifest.source.value}\n"
            f"Window: {self.manifest.start_time.isoformat()} — {self.manifest.end_time.isoformat()}\n"
        )
        if self.manifest.description:
            header += f"Notes: {self.manifest.description}\n"

        lines: List[str] = [header, "Findings:"]
        for estimate in self.estimates:
            ci = estimate.interval
            lines.append(
                f"- {estimate.metric} ({estimate.method}): "
                f"{estimate.estimate:.4f} impact with CI [{ci.lower:.4f}, {ci.upper:.4f}]"
            )
            for sensitivity in estimate.sensitivity:
                sci = sensitivity.interval
                lines.append(
                    f"  · Sensitivity[{sensitivity.name}] multiplier={sensitivity.multiplier:.2f} "
                    f"→ CI [{sci.lower:.4f}, {sci.upper:.4f}]"
                )

        if self.governance_notes:
            lines.append("Governance signals:")
            for key, value in sorted(self.governance_notes.items()):
                lines.append(f"- {key}: {value:.4f}")

        return "\n".join(lines)


@dataclass(frozen=True)
class PICAOptions:
    """Configuration options controlling estimator behaviour and sensitivity toggles."""

    ci_level: float = 0.95
    sensitivity_multipliers: Mapping[str, float] = field(default_factory=dict)

    def iter_sensitivities(self) -> Iterable[SensitivityResult]:
        for name, multiplier in self.sensitivity_multipliers.items():
            yield SensitivityResult(name=name, interval=ConfidenceInterval(0.0, 0.0), multiplier=multiplier)
