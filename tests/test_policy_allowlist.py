import os
import pytest
from summit.policy.policy_engine import SummitPolicyEngine

@pytest.fixture
def engine():
    return SummitPolicyEngine(config_path="policy/tool_allowlist.yaml")

def test_tool_allowlist(engine):
    assert engine.is_tool_allowed("web_search")
    assert engine.is_tool_allowed("calculator")
    assert not engine.is_tool_allowed("shell_exec")
    assert not engine.is_tool_allowed("unknown_tool")

def test_domain_allowlist(engine):
    assert engine.is_domain_allowed("wikipedia.org")
    assert engine.is_domain_allowed("en.wikipedia.org")
    assert engine.is_domain_allowed("arxiv.org")
    assert not engine.is_domain_allowed("malicious-site.com")
    assert not engine.is_domain_allowed("example.org")

def test_kill_switch():
    os.environ["SUMMIT_POLICY_ENABLE"] = "0"
    engine = SummitPolicyEngine(config_path="policy/tool_allowlist.yaml")

    # Everything should be allowed when disabled
    assert engine.is_tool_allowed("shell_exec")
    assert engine.is_domain_allowed("malicious-site.com")

    # Cleanup
    del os.environ["SUMMIT_POLICY_ENABLE"]
