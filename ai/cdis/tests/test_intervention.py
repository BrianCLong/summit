import pandas as pd

from cdis.service import CausalDiscoveryService
from cdis.storage import SimulationStore


def test_counterfactual_delta_and_paths():
    df = pd.read_csv("ai/cdis/tests/fixtures/synthetic_data.csv")
    service = CausalDiscoveryService(store=SimulationStore())
    sim = service.discover(df.to_dict(orient="records"), algorithm="notears")
    _, simulator = service.intervene(sim.sim_id, {"treatment": 1.0}, target="outcome")
    result = simulator.intervene(
        sim_id=sim.sim_id,
        interventions={"treatment": 1.5},
        target="outcome",
        confidence=sim.confidence,
        top_k_paths=3,
    )
    assert result.delta["outcome"] > 0
    assert result.paths
    assert any("treatment" in p.path[0] for p in result.paths)
