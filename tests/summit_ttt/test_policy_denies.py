import pytest
import os
import json
from summit_ttt import policies

def test_check_global_kill_switch_denies_by_default():
    old_val = os.environ.pop("SUMMIT_TTT_DISCOVER_ENABLED", None)
    try:
        with pytest.raises(policies.PolicyViolation, match="TTT Discover is disabled"):
            policies.check_global_kill_switch()
    finally:
        if old_val:
            os.environ["SUMMIT_TTT_DISCOVER_ENABLED"] = old_val

def test_check_training_allowed_denies_by_default():
    # Ensure env var is unset
    old_val = os.environ.pop("SUMMIT_TTT_TRAINING_ENABLED", None)
    try:
        with pytest.raises(policies.PolicyViolation, match="Training is not enabled"):
            policies.check_training_allowed()
    finally:
        if old_val:
            os.environ["SUMMIT_TTT_TRAINING_ENABLED"] = old_val

def test_check_external_network_always_denies():
    with pytest.raises(policies.PolicyViolation, match="External network access is forbidden"):
        policies.check_external_network()

def test_check_path_write_allowed_denies_sensitive_paths():
    # Load fixture
    with open("tests/fixtures/deny/blocked_path.json") as f:
        data = json.load(f)

    path = data["path"]
    with pytest.raises(policies.PolicyViolation, match="Writing to .* is not allowed"):
        policies.check_path_write_allowed(path)

    with pytest.raises(policies.PolicyViolation, match="Writing to .* is not allowed"):
        policies.check_path_write_allowed("src/summit/core.py")

def test_check_path_write_allowed_permits_runs():
    policies.check_path_write_allowed("runs/run_123/artifact.json")
    policies.check_path_write_allowed("/tmp/scratch.txt")
    policies.check_path_write_allowed("evidence/report.json")
