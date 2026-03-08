import pytest

from agents.ai_supply_chain_firewall.slopsquat_guard import analyze_slopsquat


def test_slopsquat_safe():
    result = analyze_slopsquat("requests")
    assert result["is_hallucinated"] is False

def test_slopsquat_hallucinated():
    result = analyze_slopsquat("non-existent-ai-hallucination-package")
    assert result["is_hallucinated"] is True
    assert "not found" in result["reason"]
