import pytest
from summit_harness.subagents import SubagentRegistry, SubagentSpec
from summit.self_evolve.concierge import ConciergeRouter
from summit.self_evolve.meta import MetaCognitionEngine

def test_concierge_hires_specialist():
    registry = SubagentRegistry()
    registry.register(SubagentSpec(name="coder", system_prompt="..."))
    registry.register(SubagentSpec(name="reviewer", system_prompt="..."))

    router = ConciergeRouter(registry, max_active_agents=2)

    router.hire_specialist("coder")
    assert router.get_active_agents() == ["coder"]

    router.hire_specialist("reviewer")
    assert router.get_active_agents() == ["coder", "reviewer"]

    # Test LRU eviction
    registry.register(SubagentSpec(name="tester", system_prompt="..."))
    router.hire_specialist("tester")
    assert router.get_active_agents() == ["reviewer", "tester"]
    assert "coder" not in router.get_active_agents()

def test_meta_cognition_gap_detector():
    meta = MetaCognitionEngine()
    gaps = meta.analyze_task("Write some python code and review it", available_agents=[])
    assert "coder" in gaps
    assert "reviewer" in gaps

    evidence = meta.get_gap_evidence()
    assert len(evidence) == 2
    assert evidence[0]["missing_specialist"] == "coder"
