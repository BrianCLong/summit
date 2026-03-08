"""Deterministic distance-matrix tool."""

from __future__ import annotations

import math
from typing import Any


def _euclidean_km(a: dict[str, Any], b: dict[str, Any]) -> float:
    dx = float(a["x"]) - float(b["x"])
    dy = float(a["y"]) - float(b["y"])
    return round(math.sqrt(dx * dx + dy * dy), 6)


def build_distance_matrix(stops: list[dict[str, Any]]) -> list[list[float]]:
    """Builds a deterministic NxN matrix ordered by stop `id`."""
    ordered = sorted(stops, key=lambda stop: str(stop["id"]))
    matrix: list[list[float]] = []
    for origin in ordered:
        row = []
        for destination in ordered:
            row.append(_euclidean_km(origin, destination))
        matrix.append(row)
    return matrix
