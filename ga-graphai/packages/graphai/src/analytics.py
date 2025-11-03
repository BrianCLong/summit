from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable, Mapping, Sequence

import networkx as nx



def _normalise(values: Sequence[float]) -> list[float]:
    total = float(sum(values))
    if total <= 0:
        if not values:
            return []
        return [1.0 / len(values) for _ in values]
    return [max(value, 0.0) / total for value in values]


def jensen_shannon_divergence(baseline: Sequence[float], observed: Sequence[float]) -> float:
    """Compute Jensen–Shannon divergence between two distributions."""

    if len(baseline) != len(observed):
        raise ValueError("baseline and observed must share dimensionality")

    p = _normalise(baseline)
    q = _normalise(observed)
    midpoint = [(pi + qi) / 2 for pi, qi in zip(p, q)]

    def _kl(a: Sequence[float], b: Sequence[float]) -> float:
        divergence = 0.0
        for ai, bi in zip(a, b):
            if ai == 0.0:
                continue
            if bi == 0.0:
                continue
            divergence += ai * (math.log(ai / bi))
        return divergence

    return 0.5 * _kl(p, midpoint) + 0.5 * _kl(q, midpoint)


def detect_distribution_shift(
    baseline: Sequence[float],
    observed: Sequence[float],
    threshold: float = 0.15,
) -> tuple[float, bool]:
    """Return divergence value and whether it breaches a configurable threshold."""

    score = jensen_shannon_divergence(baseline, observed)
    return score, score >= threshold


def fluid_diffusion_communities(
    graph: nx.Graph,
    damping: float = 0.85,
    iterations: int = 20,
) -> dict[str, float]:
    """Approximate community influence weights using a fluid-diffusion model."""

    if graph.number_of_nodes() == 0:
        return {}

    weights: dict[str, float] = {node: 1.0 / graph.number_of_nodes() for node in graph.nodes}

    for _ in range(max(iterations, 0)):
        next_weights = weights.copy()
        for node in graph.nodes:
            neighbours = list(graph.neighbors(node))
            if not neighbours:
                continue
            share = (1 - damping) * weights[node] / len(neighbours)
            for neighbour in neighbours:
                next_weights[neighbour] = next_weights.get(neighbour, 0.0) + share
            next_weights[node] *= damping
        weights = next_weights

    total = sum(weights.values())
    if total > 0:
        weights = {node: value / total for node, value in weights.items()}
    return weights


@dataclass(frozen=True)
class NarrativeObservation:
    """Lightweight representation of narrative telemetry."""

    identification: float
    imitation: float
    amplification: float
    emotional_triggers: Mapping[str, float]


@dataclass(frozen=True)
class NarrativeSummary:
    identification: float
    imitation: float
    amplification: float
    emotional_triggers: Mapping[str, float]
    volatility: float


def aggregate_narrative_observations(
    observations: Iterable[NarrativeObservation],
) -> NarrativeSummary:
    """Aggregate identification/imitiation/amplification telemetry."""

    observations = list(observations)
    if not observations:
        return NarrativeSummary(0.0, 0.0, 0.0, {}, 0.0)

    identification = sum(item.identification for item in observations) / len(observations)
    imitation = sum(item.imitation for item in observations) / len(observations)
    amplification = sum(item.amplification for item in observations) / len(observations)

    trigger_totals: dict[str, float] = {}
    for item in observations:
        for trigger, score in item.emotional_triggers.items():
            trigger_totals[trigger] = trigger_totals.get(trigger, 0.0) + score
    trigger_summary = {
        trigger: value / len(observations) for trigger, value in trigger_totals.items()
    }

    mean_vector = [identification, imitation, amplification]
    volatility_scores = []
    for item in observations:
        delta = [
            abs(item.identification - mean_vector[0]),
            abs(item.imitation - mean_vector[1]),
            abs(item.amplification - mean_vector[2]),
        ]
        volatility_scores.append(sum(delta) / len(delta))

    volatility = sum(volatility_scores) / len(volatility_scores)

    return NarrativeSummary(
        identification=round(identification, 4),
        imitation=round(imitation, 4),
        amplification=round(amplification, 4),
        emotional_triggers={k: round(v, 4) for k, v in trigger_summary.items()},
        volatility=round(volatility, 4),
    )


def sentiment_risk_index(emotional_scores: Mapping[str, float]) -> float:
    """Return a bounded 0-1 risk score emphasising fear/anger triggers."""

    if not emotional_scores:
        return 0.0
    critical = emotional_scores.get('fear', 0.0) + emotional_scores.get('anger', 0.0)
    supportive = emotional_scores.get('hope', 0.0) + emotional_scores.get('trust', 0.0)
    raw = critical * 1.5 + emotional_scores.get('uncertainty', 0.0) - supportive * 0.5
    return max(0.0, min(1.0, raw))
