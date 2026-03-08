from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List


@dataclass(frozen=True)
class SimResult:
    p95_ms: float
    p99_ms: float
    error_rate: float
    cost_usd_per_day: float
    saturation: float

def simulate(spec: dict[str, Any], scenario: dict[str, Any]) -> SimResult:
    # Deterministic placeholder model:
    # - cost is proportional to component count * replicas
    # - latency grows with connection count and scenario "rps"
    comps: list[dict[str, Any]] = spec["components"]
    conns: list[dict[str, Any]] = spec["connections"]
    rps = float(scenario.get("rps", 100.0))
    replica_sum = sum(int(c.get("replicas", 1)) for c in comps)
    cost = 0.10 * replica_sum * len(comps)
    base = 10.0 + 0.05 * len(conns)
    p95 = base + 0.001 * rps
    p99 = p95 * 1.6
    saturation = min(1.0, rps / max(1.0, 1000.0 * max(1, replica_sum)))
    error_rate = 0.0 if saturation < 0.85 else (saturation - 0.85) * 0.2
    return SimResult(
        p95_ms=p95,
        p99_ms=p99,
        error_rate=error_rate,
        cost_usd_per_day=cost,
        saturation=saturation
    )
