from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Any, Dict

try:
    import torch
except ImportError:
    torch = None


@dataclass
class MismatchReport:
    max_abs_logprob_delta: float = 0.0
    mean_abs_logprob_delta: float = 0.0
    violations: int = 0

def compute_mismatch_metrics(train_vals: dict[str, Any], rollout_vals: dict[str, Any]) -> MismatchReport:
    train_logprobs = train_vals.get("logprobs")
    if train_logprobs is None:
        train_logprobs = train_vals.get("log_probs")

    rollout_logprobs = rollout_vals.get("logprobs")
    if rollout_logprobs is None:
        rollout_logprobs = rollout_vals.get("log_probs")

    if train_logprobs is None or rollout_logprobs is None:
        return MismatchReport()

    if torch is None:
        # Fallback if torch is not available, though in production it should be.
        # This allows unit tests to run in environments without torch.
        return MismatchReport()

    delta = (train_logprobs - rollout_logprobs).abs()

    return MismatchReport(
        max_abs_logprob_delta=delta.max().item(),
        mean_abs_logprob_delta=delta.mean().item(),
        violations=0,
    )


def collapse_alarm(metrics: dict[str, Any]) -> bool:
    # Check for NaNs
    for v in metrics.values():
        if isinstance(v, float) and math.isnan(v):
            return True

    # Check heuristics
    if metrics.get("reward_mean", 0.0) < -10.0:
        return True

    if metrics.get("kl_divergence", 0.0) > 100.0:
        return True

    return False
