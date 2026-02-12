from summit.precision.policy import policy_from_dict

def test_no_interstep_calibration_by_default():
    # Minimal test case based on name
    policy = policy_from_dict({"mode": "bf16"})
    assert policy.mode == "bf16"
    assert policy.enforcement.allow_calibration_ops == []
