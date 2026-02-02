import pytest
from summit_harness.subagents import SubagentRegistry, SubagentSpec, SubagentContext
from summit_harness.harness import AgentHarness, HarnessConfig
from summit_harness.evidence import EvidenceWriter

def test_harness_subagent_registry():
    registry = SubagentRegistry()
    spec = SubagentSpec(name="coder", system_prompt="You are a coder", tool_allowlist={"fs.write"})
    registry.register(spec)

    assert registry.get("coder") == spec
    assert "coder" in registry.list_agents()

def test_harness_subagent_registry_not_found():
    registry = SubagentRegistry()
    with pytest.raises(ValueError, match="Subagent 'unknown' not found"):
        registry.get("unknown")

def test_harness_with_subagent_delegation(tmp_path):
    writer = EvidenceWriter(tmp_path)
    registry = SubagentRegistry()
    spec = SubagentSpec(name="reviewer", system_prompt="Review code")
    registry.register(spec)

    cfg = HarnessConfig(enabled=True)
    harness = AgentHarness(cfg, writer, registry)

    result = harness.run("Review PR #123", agent_name="reviewer")
    assert result["status"] == "ok"

    # Verify evidence was written
    assert (tmp_path / "report.json").exists()
