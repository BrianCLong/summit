import json
import os

import pytest

from summit.moral.mag_infer import MagConfig, diffuse_moral_relevance


def test_determinism():
    fixture_path = os.path.join(os.path.dirname(__file__), "../fixtures/mini_assoc_graph.json")
    with open(fixture_path) as f:
        graph = json.load(f)

    seeds = ["A"]
    res1 = diffuse_moral_relevance(graph, seeds)
    res2 = diffuse_moral_relevance(graph, seeds)

    assert res1 == res2
    assert abs(sum(res1.values()) - 1.0) < 1e-9
