"""Deterministic constraint solver tool.

This is intentionally constrained to a deterministic nearest-neighbor strategy.
"""

from __future__ import annotations

from typing import Any


def solve_route(
    stops: list[dict[str, Any]],
    distance_matrix: list[list[float]],
    max_distance_km: float | None = None,
) -> dict[str, Any]:
    """Produce a deterministic route and aggregate metrics.

    Stops are expected in the same order as `distance_matrix`.
    """
    if not stops:
        return {"route": [], "total_distance_km": 0.0}

    ordered = sorted(stops, key=lambda stop: str(stop["id"]))
    unvisited = set(range(1, len(ordered)))
    route_indices = [0]
    total_distance = 0.0

    while unvisited:
        current = route_indices[-1]
        next_index = min(
            unvisited,
            key=lambda candidate: (distance_matrix[current][candidate], str(ordered[candidate]["id"])),
        )
        step_distance = distance_matrix[current][next_index]
        if max_distance_km is not None and total_distance + step_distance > max_distance_km:
            raise ValueError("Route violates max_distance_km constraint")
        total_distance = round(total_distance + step_distance, 6)
        route_indices.append(next_index)
        unvisited.remove(next_index)

    return {
        "route": [ordered[index]["id"] for index in route_indices],
        "total_distance_km": total_distance,
    }
