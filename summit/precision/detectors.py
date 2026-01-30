from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict


@dataclass
class MismatchReport:
    max_abs_logprob_delta: float = 0.0
    mean_abs_logprob_delta: float = 0.0
    violations: int = 0

def compute_mismatch_metrics(train_vals: dict[str, Any], rollout_vals: dict[str, Any]) -> MismatchReport:
    # TODO: wire real tensors; keep API stable.
    return MismatchReport()

def collapse_alarm(metrics: dict[str, Any]) -> bool:
    # TODO: implement reward/kl/nan heuristics
    return False
