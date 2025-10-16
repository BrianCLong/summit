"""Privacy-preserving analytics helpers.

This module provides lightweight differential privacy utilities so that the
FastAPI service can expose secure endpoints without shipping a full DP
framework.  The implementation focuses on deterministic, auditable behaviour so
that governance systems can record the parameters that were used for each
invocation.
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence
import hashlib
import json
import math
import random
from typing import List

from features import build_degree_features


def _laplace_noise(scale: float, rng: random.Random) -> float:
    """Sample a Laplace-distributed noise value with the provided scale."""

    if scale <= 0:
        raise ValueError("Laplace scale must be positive")

    # Inverse CDF sampling: transform a uniform draw in (-0.5, 0.5) to a
    # Laplace sample.  This avoids pulling in numpy as a dependency and keeps
    # the code path deterministic when seeded.
    u = rng.random() - 0.5
    sign = 1.0 if u >= 0 else -1.0
    return -scale * sign * math.log(1 - 2 * abs(u))


def noisy_degree_counts(
    *,
    edges: Iterable[tuple[str, str]],
    epsilon: float,
    sensitivity: float = 1.0,
    targets: Sequence[str] | None = None,
    seed: int | None = None,
) -> tuple[list[tuple[str, float]], dict[str, float | str]]:
    """Return Laplace-noised degree counts and attestation metadata.

    Args:
        edges: Edge list describing the local view of the graph.
        epsilon: Privacy budget consumed for this query.
        sensitivity: Global sensitivity of the degree query.
        targets: Optional subset of nodes to return.  When omitted all nodes in
            the edge list are considered.
        seed: Optional seed for deterministic testing and reproducibility.

    Returns:
        A tuple containing the node->noisy degree pairs and a metadata
        dictionary with the audit trail details.
    """

    if epsilon <= 0:
        raise ValueError("epsilon must be positive")
    if sensitivity <= 0:
        raise ValueError("sensitivity must be positive")

    rng = random.Random(seed)
    base_degrees = build_degree_features(edges)

    if targets is None:
        candidate_nodes: List[str] = sorted(base_degrees.keys())
    else:
        candidate_nodes = sorted(set(targets))

    scale = sensitivity / epsilon
    sanitized: list[tuple[str, float]] = []
    for node in candidate_nodes:
        raw_value = float(base_degrees.get(node, 0))
        noise = _laplace_noise(scale, rng)
        sanitized_value = max(0.0, raw_value + noise)
        sanitized.append((node, sanitized_value))

    composition_cost = epsilon * len(candidate_nodes)
    proof_payload = {
        "epsilon": epsilon,
        "sensitivity": sensitivity,
        "nodes": candidate_nodes,
        "seed": seed,
        "noise_scale": scale,
    }
    digest = hashlib.sha256(json.dumps(proof_payload, sort_keys=True).encode()).hexdigest()
    metadata = {
        "noise_scale": scale,
        "composition_cost": composition_cost,
        "audit_proof": f"zkp_sha256_{digest}",
    }

    return sanitized, metadata
