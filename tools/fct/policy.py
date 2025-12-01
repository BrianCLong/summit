"""Policy enforcement for fairness envelopes and deployment gating."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Mapping


@dataclass(frozen=True)
class FairnessEnvelope:
    """Defines allowable fairness thresholds before deployment."""

    demographic_parity_diff: float
    tpr_gap: float
    fpr_gap: float

    def as_dict(self) -> Dict[str, float]:
        return {
            "demographic_parity_diff": self.demographic_parity_diff,
            "tpr_gap": self.tpr_gap,
            "fpr_gap": self.fpr_gap,
        }


class PolicyViolation(RuntimeError):
    """Raised when metrics fall outside the approved fairness envelope."""

    def __init__(self, metric: str, value: float, limit: float) -> None:
        message = (
            f"Metric '{metric}' with value {value:.4f} exceeds the approved envelope of {limit:.4f}."
        )
        super().__init__(message)
        self.metric = metric
        self.value = value
        self.limit = limit


class PolicyGate:
    """Blocks deployments that fail to satisfy fairness envelope requirements."""

    def __init__(self, envelope: FairnessEnvelope) -> None:
        self.envelope = envelope

    def evaluate(self, report: Mapping[str, float]) -> None:
        envelope_dict = self.envelope.as_dict()
        missing = [metric for metric in envelope_dict if metric not in report]
        if missing:
            missing_metrics = ", ".join(missing)
            raise ValueError(f"Report is missing required metrics: {missing_metrics}")

        for metric, limit in envelope_dict.items():
            value = float(report[metric])
            if value > limit:
                raise PolicyViolation(metric=metric, value=value, limit=limit)

    def approve(self, report: Mapping[str, float]) -> bool:
        self.evaluate(report)
        return True
