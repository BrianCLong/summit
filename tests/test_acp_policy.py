import pytest

from summit.acp.policy import AcpPolicy, assert_https_and_allowlisted


def test_rejects_http():
    with pytest.raises(ValueError, match="GATE-ACP-SC-001: non-https url"):
        assert_https_and_allowlisted("http://evil.example/a.tgz", AcpPolicy(install_enabled=True))

def test_rejects_unallowlisted_domain():
    with pytest.raises(ValueError, match="GATE-ACP-SC-001: domain not allowlisted"):
        assert_https_and_allowlisted("https://evil.example/a.tgz", AcpPolicy(install_enabled=True))

def test_accepts_allowlisted_domain():
    # Should not raise
    assert_https_and_allowlisted("https://cdn.agentclientprotocol.com/agent.tgz", AcpPolicy(install_enabled=True))
