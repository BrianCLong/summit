from summit.policy.gates.gate_dependency_delta import check_dependency_delta
from summit.policy.gates.gate_no_secret_logs import check_no_secrets_in_logs


def test_gate_dependency_delta():
    # Pass: no dep files changed
    passed, msg = check_dependency_delta(["README.md"])
    assert passed

    # Fail: package.json changed but no delta updated
    passed, msg = check_dependency_delta(["package.json"])
    assert not passed
    assert "dependency-delta.md" in msg

    # Pass: both changed
    passed, msg = check_dependency_delta(["package.json", "dependency-delta.md"])
    assert passed

def test_gate_no_secret_logs():
    # Pass: clean content
    passed, msg = check_no_secrets_in_logs("All tests passed.")
    assert passed

    # Fail: kubeconfig pattern
    passed, msg = check_no_secrets_in_logs("apiVersion: v1\nkind: Config\nclusters:")
    assert not passed
    assert "Potential secret leakage" in msg

    # Fail: Private key
    passed, msg = check_no_secrets_in_logs("---BEGIN RSA PRIVATE KEY---")
    assert not passed
