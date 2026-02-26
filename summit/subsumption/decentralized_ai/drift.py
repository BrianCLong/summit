"""Drift detection for decentralization metrics."""

from __future__ import annotations

from typing import Any


def detect_drift(baseline: dict[str, float], current: dict[str, float], threshold: float = 0.1) -> dict[str, Any]:
    """Detect metric drift with deterministic output ordering."""
    keys = sorted(set(baseline) | set(current))
    deltas: list[dict[str, float | str | bool]] = []
    triggered = False

    for key in keys:
        base = float(baseline.get(key, 0.0))
        now = float(current.get(key, 0.0))
        delta = now - base
        percent = 0.0 if base == 0 else delta / abs(base)
        breach = abs(percent) > threshold
        triggered = triggered or breach
        deltas.append(
            {
                "metric": key,
                "baseline": base,
                "current": now,
                "delta": delta,
                "percent": percent,
                "breach": breach,
            }
        )

    return {"triggered": triggered, "threshold": threshold, "deltas": deltas}
