import pytest

from codemode.policy import DEFAULT_POLICY, SandboxPolicy
from codemode.sandbox.local_runner import LocalSandboxRunner


def test_network_deny_default():
    policy = DEFAULT_POLICY
    assert policy.allow_network is False

    runner = LocalSandboxRunner(policy)
    with pytest.raises(PermissionError, match="Network access denied"):
        runner.run_code("import requests")

def test_network_allowed_explicitly():
    policy = SandboxPolicy(allow_network=True)
    runner = LocalSandboxRunner(policy)
    # Should not raise
    result = runner.run_code("import requests")
    assert result == "Executed safely (stub)"

def test_fs_deny_default():
    runner = LocalSandboxRunner(DEFAULT_POLICY)
    with pytest.raises(PermissionError, match="Filesystem access denied"):
        runner.run_code("f = open('test.txt')")
