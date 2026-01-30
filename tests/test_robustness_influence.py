import json
import os
import tempfile

import pytest

from summit.eval.robustness_influence import (
    perturb_edge_injection,
    perturb_sybil_attack,
    run_robustness_suite,
)


def test_edge_injection():
    graph = {"nodes": ["A", "B"], "edges": [{"source": "A", "target": "B"}]}
    g_new = perturb_edge_injection(graph, injection_rate=1.0) # Force injection
    assert len(g_new["edges"]) > len(graph["edges"])

def test_sybil_attack():
    graph = {"nodes": ["A"], "edges": []}
    g_new = perturb_sybil_attack(graph, sybil_count=3)
    assert len(g_new["nodes"]) == 4 # 1 original + 3 sybils
    # 3 sybils form a clique: 3 nodes -> 3 edges (0-1, 0-2, 1-2)
    assert len(g_new["edges"]) == 3

def test_suite_evidence():
    graph = {"nodes": ["A"], "edges": []}
    with tempfile.TemporaryDirectory() as tmpdir:
        # Mock evidence structure
        # evidence/EVD-.../metrics.json
        # run_robustness_suite expects the directory to exist

        run_robustness_suite(graph, evidence_path=tmpdir)

        metrics_file = os.path.join(tmpdir, "metrics.json")
        assert os.path.exists(metrics_file)

        with open(metrics_file) as f:
            m = json.load(f)
            assert "instability_score" in m
