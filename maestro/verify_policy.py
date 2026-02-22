import os
import sys

# Ensure maestro is in path
sys.path.append(os.getcwd())

from maestro.checks import check_run_policy_gate

def test_policy_fallback():
    os.environ["COMPANYOS_BASE_URL"] = "http://invalid-pdp"
    os.environ["COMPANYOS_ENFORCE"] = "1"
    res = check_run_policy_gate("t1", "u1", "r1", "res1")
    print(f"Passed: {res.passed}, Message: {res.message}")
    print(f"Details: {res.details}")
    assert res.passed == True
    assert res.details["policy_version"] == "fallback"
    assert res.details["audit_event_id"].startswith("fallback-")

if __name__ == "__main__":
    test_policy_fallback()
    print("Maestro policy gate verification passed!")
