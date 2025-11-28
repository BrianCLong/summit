from pathlib import Path

import pandas as pd
import pytest

from cdis.service import CausalDiscoveryService
from cdis.storage import SimulationStore

FIXTURE_DIR = Path(__file__).parent / "fixtures"


def test_notears_discovers_edges_with_tolerance():
    df = pd.read_csv(FIXTURE_DIR / "synthetic_data.csv")
    service = CausalDiscoveryService(store=SimulationStore())
    sim = service.discover(df.to_dict(orient="records"), algorithm="notears")
    adjacency = sim.graph.adjacency()
    assert "treatment" in adjacency
    assert "outcome" in adjacency
    assert adjacency["treatment"]["mediator"] == pytest.approx(0.6, rel=0.4)
    assert adjacency["mediator"]["outcome"] == pytest.approx(1.2, rel=0.4)
    assert adjacency["treatment"]["outcome"] == pytest.approx(0.4, rel=0.5)


def test_pc_and_granger_produce_graphs():
    df = pd.read_csv(FIXTURE_DIR / "synthetic_data.csv")
    service = CausalDiscoveryService(store=SimulationStore())
    sim_pc = service.discover(df.to_dict(orient="records"), algorithm="pc")
    sim_gr = service.discover(df.to_dict(orient="records"), algorithm="granger")
    assert sim_pc.graph.edges
    assert sim_gr.graph.edges
    assert sim_pc.confidence <= 1
    assert sim_gr.confidence <= 1
