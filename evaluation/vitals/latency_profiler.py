from __future__ import annotations


def p95_latency_ms(values: list[float]) -> float:
    if not values:
        raise ValueError("values must not be empty")
    ordered = sorted(values)
    index = max(0, int(round(0.95 * (len(ordered) - 1))))
    return float(ordered[index])
