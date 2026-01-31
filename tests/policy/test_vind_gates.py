# tests/policy/test_vind_gates.py
from summit.policy.gates.gate_no_secret_logs import verify_no_secrets
from summit.policy.gates.gate_dependency_delta import verify_delta_updated

def test_gate_no_secret_logs():
    bad_content = "some logs with apiVersion: v1 and kind: Config"
    violations = verify_no_secrets(bad_content)
    assert "detected_secret_pattern:apiVersion: v1" in violations
    assert "detected_secret_pattern:kind: Config" in violations

    good_content = "some clean logs"
    assert len(verify_no_secrets(good_content)) == 0

def test_gate_dependency_delta():
    # Dep change but no delta update
    changed_files = ["package.json", "src/main.ts"]
    violations = verify_delta_updated(changed_files)
    assert "missing_dependency_delta_update" in violations

    # Dep change and delta update
    changed_files = ["package.json", "DEPENDENCY_DELTA.md"]
    assert len(verify_delta_updated(changed_files)) == 0

    # No dep change
    changed_files = ["src/main.ts"]
    assert len(verify_delta_updated(changed_files)) == 0
