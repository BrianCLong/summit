import pytest
from summit.slopguard.scoring import get_slop_score

def test_get_slop_score_empty():
    result = get_slop_score("")
    assert result["score"] == 0.0
    assert "EMPTY_CONTENT" in result["reasons"]

def test_get_slop_score_repetitive():
    text = "test test test test test test test test"
    result = get_slop_score(text)
    # repetition score should be high
    assert result["metrics"]["repetition"] > 0.5
    assert any("HIGH_REPETITION" in r for r in result["reasons"])

def test_get_slop_score_boilerplate():
    text = "In conclusion, it is important to note that this is mostly boilerplate."
    result = get_slop_score(text)
    # boilerplate score should be non-zero
    assert result["metrics"]["boilerplate"] > 0
    # check if total score > 0
    assert result["score"] > 0

def test_get_slop_score_normal():
    text = "This is a normal sentence with high entropy and unique words."
    result = get_slop_score(text)
    assert result["metrics"]["repetition"] < 0.5
    assert result["metrics"]["boilerplate"] == 0.0
    # Entropy should be decent
    assert result["metrics"]["entropy"] > 0
