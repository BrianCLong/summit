import math
import pathlib
import sys

import networkx as nx

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))
from analytics import (  # type: ignore  # noqa: E402
    NarrativeObservation,
    aggregate_narrative_observations,
    detect_distribution_shift,
    fluid_diffusion_communities,
    sentiment_risk_index,
)


def test_detect_distribution_shift_flags_threshold():
    divergence, breached = detect_distribution_shift([0.4, 0.6], [0.1, 0.9], threshold=0.05)
    assert divergence > 0
    assert breached is True


def test_fluid_diffusion_conserves_mass():
    graph = nx.Graph()
    graph.add_edges_from([("a", "b"), ("b", "c")])
    weights = fluid_diffusion_communities(graph, damping=0.8, iterations=5)
    assert math.isclose(sum(weights.values()), 1.0, rel_tol=1e-6)
    assert set(weights) == {"a", "b", "c"}


def test_narrative_aggregation_and_sentiment():
    summary = aggregate_narrative_observations(
        [
            NarrativeObservation(
                identification=0.8,
                imitation=0.4,
                amplification=0.5,
                emotional_triggers={"fear": 0.3, "hope": 0.2},
            ),
            NarrativeObservation(
                identification=0.6,
                imitation=0.5,
                amplification=0.55,
                emotional_triggers={"fear": 0.2, "anger": 0.1},
            ),
        ]
    )
    risk = sentiment_risk_index(summary.emotional_triggers)
    assert summary.identification > 0
    assert summary.volatility >= 0
    assert 0 <= risk <= 1
