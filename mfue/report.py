"""Reporting utilities for MFUE."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

from .metrics import EvaluationResult


@dataclass
class EvaluationReport:
    """Human friendly report built from an :class:`EvaluationResult`."""

    result: EvaluationResult

    def certification(self) -> Dict[str, str | float]:
        """Return a dictionary certifying residual risk bands."""

        return {
            "residual_risk_band": self.result.residual_risk_band(),
            "post_membership_auc": self.result.post_membership_auc,
            "forget_significance_p": self.result.forget_significance_p,
            "holdout_accuracy_delta": self.result.holdout_accuracy_delta,
        }

    def to_text(self) -> str:
        band = self.result.residual_risk_band().upper()
        lines = [
            "Model Forgetting & Unlearning Evaluation Report",
            "==============================================",
            f"Forget accuracy drop: {self.result.forget_accuracy_drop:.3f}",
            f"Forget set significance (p-value): {self.result.forget_significance_p:.4f}",
            f"Membership inference AUC (post): {self.result.post_membership_auc:.3f}",
            f"Residual risk band: {band}",
            f"Holdout accuracy delta: {self.result.holdout_accuracy_delta:.3f}",
        ]
        return "\n".join(lines)
