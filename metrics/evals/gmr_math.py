from __future__ import annotations

from typing import Iterable, List


def median(values: Iterable[float]) -> float:
    data = sorted(values)
    if not data:
        raise ValueError("median requires at least one value")
    mid = len(data) // 2
    if len(data) % 2 == 1:
        return float(data[mid])
    return (data[mid - 1] + data[mid]) / 2


def mad(values: Iterable[float]) -> float:
    data: list[float] = list(values)
    if not data:
        raise ValueError("mad requires at least one value")
    med = median(data)
    deviations = [abs(value - med) for value in data]
    return median(deviations)
