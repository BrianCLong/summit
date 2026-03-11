import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'summit')))

from decoy_narratives.model import (
    DecoyLattice,
    SensitivityProfile,
    generate_decoy_lattice,
    mark_decoy_triggered,
)
from decoy_narratives.planner import CounterTerrainPlanner, PlannerInput, cli_plan
from decoy_narratives.sandbox import SandboxGraph, SandboxLoader, compute_early_warning_metrics


# --- PR 1 Tests ---
def test_generate_lattice_deterministic():
    profile = SensitivityProfile.EXECUTIVE_BRAND
    scenarios = ["bot_amp"]

    lattice1 = generate_decoy_lattice(profile, scenarios, num_nodes=3, num_relations=2)

    assert len(lattice1.nodes) == 3
    assert len(lattice1.relations) == 2
    assert lattice1.nodes[0].is_decoy is True
    assert lattice1.nodes[0].decoy_id.startswith("decoy_")
    assert lattice1.sensitivity_profile == profile

def test_mark_triggered():
    profile = SensitivityProfile.CRITICAL_INFRA
    scenarios = ["graphemic_evasion"]

    lattice = generate_decoy_lattice(profile, scenarios, num_nodes=1, num_relations=0)
    target_id = lattice.nodes[0].decoy_id

    assert lattice.nodes[0].is_triggered is False
    res = mark_decoy_triggered(lattice, target_id)
    assert res is True
    assert lattice.nodes[0].is_triggered is True

# --- PR 2 Tests ---
def test_sandbox_metrics():
    profile = SensitivityProfile.GEOSECURITY
    lattice = generate_decoy_lattice(profile, ["scenario_a"], num_nodes=2, num_relations=1)

    graph = SandboxGraph()
    graph.add_lattice(lattice)
    graph.add_real_ish_node({"id": "real_1"})

    loader = SandboxLoader(graph)
    all_nodes = loader.get_all_nodes()

    assert len(all_nodes) == 3 # 2 decoy, 1 real

    decoy_id_1 = lattice.nodes[0].decoy_id

    metrics = compute_early_warning_metrics(
        loader,
        simulated_hits=[decoy_id_1, "real_1"],
        simulated_paths=[[decoy_id_1, "real_1"], ["real_1"]]
    )

    assert metrics.decoy_attraction_score == 0.5 # 1/2 hits are decoys
    assert metrics.brittle_dependency_score == 0.5 # 1/2 paths use decoy

# --- PR 3 Tests ---
def test_planner():
    planner = CounterTerrainPlanner()

    # Test Exec
    out_exec = planner.plan(PlannerInput(
        profile=SensitivityProfile.EXECUTIVE_BRAND,
        risk_scenarios=["test_1"]
    ))
    assert len(out_exec.planned_lattices) == 1
    assert out_exec.planned_lattices[0].nodes_count == 10

    # Test ICS
    out_ics = planner.plan(PlannerInput(
        profile=SensitivityProfile.CRITICAL_INFRA,
        risk_scenarios=["test_2"]
    ))
    assert len(out_ics.planned_lattices) == 1
    assert out_ics.planned_lattices[0].relations_count == 15

def test_cli_plan():
    res = cli_plan("EXECUTIVE_BRAND")
    assert "executive_rumor_decoys" in res
