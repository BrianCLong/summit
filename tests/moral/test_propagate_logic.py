import pytest

from summit.moral.foundations import UNKNOWN_KEY
from summit.moral.propagate import propagate_priors


def test_propagate_logic_basic():
    # Graph: A -> B
    graph = {"A": {"B": 1.0}, "B": {}}

    # Priors: A has {care: 1.0}, B has no prior
    priors = {"A": {"care": 1.0}}

    # alpha = 0.5
    # A's posterior:
    #   Prior: {care: 1.0}
    #   Neighbors: B (weight 1.0). B has no prior -> unknown
    #   Neighbor sum: {unknown: 1.0}
    #   Combined (pre-norm): 0.5 * {care: 1.0} + 0.5 * {unknown: 1.0} -> {care: 0.5, unknown: 0.5}

    # Normalize behavior (from foundations.py):
    #   Total MFT5 mass = 0.5 (from care)
    #   Since total > 0, it re-normalizes MFT5 to sum to 1.
    #   Care -> 0.5 / 0.5 = 1.0.
    #   Unknown -> 0.0.

    res = propagate_priors(graph, priors, alpha=0.5)

    assert res["A"]["care"] == 1.0
    assert res["A"][UNKNOWN_KEY] == 0.0

def test_propagate_logic_conflict():
    # Graph: A -> B
    graph = {"A": {"B": 1.0}, "B": {}}

    # Priors: A has {care: 1.0}, B has {fairness: 1.0}
    priors = {"A": {"care": 1.0}, "B": {"fairness": 1.0}}

    # alpha = 0.5
    # Combined (pre-norm): {care: 0.5, fairness: 0.5}
    # Normalize: {care: 0.5, fairness: 0.5}

    res = propagate_priors(graph, priors, alpha=0.5)

    assert res["A"]["care"] == 0.5
    assert res["A"]["fairness"] == 0.5
