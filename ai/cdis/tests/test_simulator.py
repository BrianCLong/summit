import json
from pathlib import Path

from ai.cdis.models import Graph, InterveneRequest, Intervention
from ai.cdis.simulator import do_calculus

FIXTURE = Path(__file__).parent.parent / "fixtures" / "gold_dag.json"


def load_graph() -> Graph:
    with FIXTURE.open() as f:
        payload = json.load(f)
    return Graph(nodes=payload["nodes"], edges=payload["edges"])


def test_do_calculus_returns_effects_and_paths():
    graph = load_graph()
    request = InterveneRequest(
        graph=graph,
        interventions=[Intervention(node="treatment", value=1.0)],
        baseline={node: 0.0 for node in graph.nodes},
        k_paths=2,
    )
    response = do_calculus(request)
    assert response.effects
    effect_nodes = {e.node for e in response.effects}
    assert "outcome" in effect_nodes
    assert response.effects[0].contributing_paths
