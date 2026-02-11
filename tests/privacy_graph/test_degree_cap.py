import pytest

from summit.privacy_graph.dp import cap_degree, gaussian_noise


def test_cap_degree_limits_neighbors():
    edges = [("a", "b"), ("a", "c"), ("a", "d"), ("a", "e")]
    # max degree 2. "a" connects to b, c. d and e dropped.
    capped = cap_degree(edges, max_degree=2)
    assert len(capped) == 2
    assert capped == [("a", "b"), ("a", "c")]

def test_cap_degree_limits_both_ends():
    # a->b, c->b, d->b. b has degree 3.
    edges = [("a", "b"), ("c", "b"), ("d", "b")]
    capped = cap_degree(edges, max_degree=2)
    assert len(capped) == 2
    assert ("d", "b") not in capped

def test_gaussian_noise_deterministic():
    n1 = gaussian_noise(1.0, seed=42)
    n2 = gaussian_noise(1.0, seed=42)
    assert n1 == n2
    assert n1 != gaussian_noise(1.0, seed=43)
