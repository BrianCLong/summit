"""Deterministic planner orchestrating route optimization tools."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from .reporter import write_artifacts
from .tools.constraint_solver import solve_route
from .tools.distance_matrix import build_distance_matrix
from .validator import validate_output


def _stable_hash(payload: dict[str, Any]) -> str:
    """Compute a deterministic SHA-256 hash of the payload.

    Args:
        payload: Dictionary to hash.

    Returns:
        Hex digest of the SHA-256 hash.
    """
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def run(input_data: dict[str, Any]) -> dict[str, Any]:
    """Execute deterministic route planning using input data.

    Orchestrates the route optimization process by validating inputs,
    solving the route constraints, generating artifacts, and validating
    the final report schema.

    Args:
        input_data: Dictionary containing 'stops' and 'constraints'.

    Returns:
        The generated route plan report.
    """
    evidence_id = str(input_data.get("evidence_id", "EVID-ROUTE-OPT-0001"))
    constraints = input_data.get("constraints", {})

    stops = sorted(input_data["stops"], key=lambda stop: str(stop["id"]))
    distance_matrix = build_distance_matrix(stops)
    solution = solve_route(stops, distance_matrix, constraints.get("max_distance_km"))

    report = {
        "evidence_id": evidence_id,
        "schema_version": "1.0.0",
        "input_hash": _stable_hash({"stops": stops, "constraints": constraints}),
        "constraints": constraints,
        "stops": stops,
        "distance_matrix": distance_matrix,
        "solution": solution,
    }

    validate_output(report)
    write_artifacts(report)
    return report
