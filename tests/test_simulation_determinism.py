import json

from summit_narrative.nog.model import Edge, NarrativeOperatingGraph, Node
from summit_narrative.simulation.counterfactual import simulate


def _serialize(result) -> str:
    payload = {
        "input_snapshot": result.input_snapshot,
        "hypothetical_snapshot": result.hypothetical_snapshot,
        "metrics": result.metrics,
    }
    return json.dumps(payload, sort_keys=True, separators=(",", ":"))


def test_simulation_replay_determinism():
    nog = NarrativeOperatingGraph(
        nodes=[
            Node(
                id="state-1",
                type="narrative_state",
                attrs={"title": "Seed"},
                lifecycle="seeding",
                classification="internal",
            )
        ],
        edges=[
            Edge(
                src="state-1",
                dst="state-1",
                type="temporal_precedes",
                attrs={"delta": 0},
            )
        ],
        version="1",
    )
    intervention = {"channel": "internal_review", "simulate_only": True}
    result_a = simulate(nog, intervention)
    result_b = simulate(nog, intervention)
    assert _serialize(result_a) == _serialize(result_b)
