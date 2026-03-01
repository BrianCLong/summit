import os

import pytest

from summit.agents.runtime import AgentRuntime, ToolSpec


class MockPolicy:
    def __init__(self, allowed):
        self.allowed = allowed
    def allow(self, tool_name):
        return tool_name in self.allowed

def test_agent_runtime_feature_flag(monkeypatch):
    monkeypatch.delenv("SUMMIT_ENABLE_AGENT_RUNTIME", raising=False)
    runtime = AgentRuntime([], MockPolicy([]))
    with pytest.raises(PermissionError, match="disabled by feature flag"):
        runtime.execute([{"tool": "git"}])

def test_agent_runtime_policy_denied(monkeypatch):
    monkeypatch.setenv("SUMMIT_ENABLE_AGENT_RUNTIME", "1")
    runtime = AgentRuntime([ToolSpec("git", {})], MockPolicy(["fs"]))
    with pytest.raises(PermissionError, match="Denied by policy"):
        runtime.execute([{"tool": "git"}])

def test_agent_runtime_policy_allowed(monkeypatch):
    monkeypatch.setenv("SUMMIT_ENABLE_AGENT_RUNTIME", "1")
    runtime = AgentRuntime([ToolSpec("git", {})], MockPolicy(["git"]))
    result = runtime.execute([{"tool": "git"}])
    assert "evidence" in result
    evidence = result["evidence"]
    assert len(evidence) == 1
    assert evidence[0]["tool"] == "git"
    assert evidence[0]["evidence_id"].startswith("EVID-AGENT-")
    assert evidence[0]["claim_ref"] == "ITEM:CLAIM-01 | Summit original"
