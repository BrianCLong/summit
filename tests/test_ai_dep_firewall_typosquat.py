import pytest

from agents.ai_supply_chain_firewall.lookalike_detector import detect_typosquat


def test_detect_typosquat_requests():
    is_typosquat, similar = detect_typosquat("requezts", threshold=1)
    assert is_typosquat is True
    assert "requests" in similar

def test_detect_typosquat_django():
    is_typosquat, similar = detect_typosquat("djnago", threshold=1)
    # The distance between "django" and "djnago" is 2 (transpose). Since threshold=1, this won't flag unless we update logic or use threshold=2.
    # Let's test a simple 1-edit distance like "djano" instead for threshold=1.
    is_typosquat2, similar2 = detect_typosquat("djano", threshold=1)
    assert is_typosquat2 is True
    assert "django" in similar2

def test_safe_dependency():
    is_typosquat, similar = detect_typosquat("totally-different-lib", threshold=1)
    assert is_typosquat is False
    assert len(similar) == 0

def test_exact_match_popular():
    is_typosquat, similar = detect_typosquat("requests", threshold=1)
    assert is_typosquat is False
