import pytest

from summit.moral.foundations import MFT5, UNKNOWN_KEY, normalize


def test_normalize_standard():
    vec = {"care": 1.0, "fairness": 1.0}
    norm = normalize(vec)
    assert norm["care"] == 0.5
    assert norm["fairness"] == 0.5
    assert norm["loyalty"] == 0.0
    assert norm[UNKNOWN_KEY] == 0.0

def test_normalize_zero_mass():
    vec = {}
    norm = normalize(vec)
    assert norm[UNKNOWN_KEY] == 1.0
    assert norm["care"] == 0.0

def test_normalize_unknown_disabled():
    vec = {}
    norm = normalize(vec, allow_unknown=False)
    if UNKNOWN_KEY in norm:
        assert norm[UNKNOWN_KEY] == 0.0
    assert sum(norm.values()) == 0.0
