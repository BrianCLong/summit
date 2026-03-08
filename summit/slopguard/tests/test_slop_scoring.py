import pytest

from summit.slopguard.scoring import get_slop_score


def test_high_repetition_scoring():
    text = "This is a test. This is a test. This is a test. " * 10
    results = get_slop_score(text)
    assert results["score"] > 0.1
    assert any(r.startswith("HIGH_REPETITION") for r in results["reasons"])

def test_boilerplate_scoring():
    text = "As an AI language model, I can say that delving into the intricate tapestry is important to note."
    results = get_slop_score(text)
    assert results["score"] > 0.2
    assert any(r.startswith("HIGH_BOILERPLATE") for r in results["reasons"])

def test_low_entropy_scoring():
    text = "aaaaabbbbbcccccdddddeeeee"
    results = get_slop_score(text)
    assert any(r.startswith("LOW_ENTROPY") for r in results["reasons"])

def test_clean_text_scoring():
    text = "The quick brown fox jumps over the lazy dog. A unique sentence with various characters and no common AI phrases."
    results = get_slop_score(text)
    assert results["score"] < 0.2
    assert len([r for r in results["reasons"] if "ENTROPY" not in r]) == 0
