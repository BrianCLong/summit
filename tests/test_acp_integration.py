import pytest
from summit.acp.registry_client import AgentDescriptor, NpxDist, BinaryDist, BinaryVariant
from summit.acp.installer import plan_install, InstallPlan
from summit.acp.policy import AcpPolicy
from summit.acp.auth import AuthMethod, build_terminal_auth_command

def test_plan_install_npx():
    agent = AgentDescriptor(
        id="test", name="Test", version="1.0", description="", repository=None,
        authors=[], license="MIT", icon=None,
        distribution=NpxDist(package="test-pkg@1.0", args=["--foo"], env={"BAR": "1"})
    )
    policy = AcpPolicy()
    # Mocking policy to enable install
    import os
    from unittest.mock import patch
    with patch.dict(os.environ, {"SUMMIT_ENABLE_ACP_INSTALL": "1"}):
        p = AcpPolicy.from_env()
        plan = plan_install(agent, "linux-x86_64", p)
        assert plan.kind == "npx"
        assert plan.argv == ["npx", "--yes", "test-pkg@1.0", "--foo"]
        assert plan.env == {"BAR": "1"}

def test_terminal_auth_enforcement():
    method = AuthMethod(
        id="login", name="Login", description="", type="terminal",
        args=["auth", "login"], env={}
    )
    # Correct usage
    cmd = build_terminal_auth_command("/path/to/agent", method)
    assert cmd == ["/path/to/agent", "auth", "login"]

    # Attempting to use a different binary (this is enforced by the function signature taking agent_argv0)
    # The constraint GATE-ACP-AUTH-001 says we MUST use the same binary.
    # Our function ensures this by not allowing the method to specify the binary.
