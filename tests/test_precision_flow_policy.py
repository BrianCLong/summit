from summit.precision.policy import policy_from_dict


def test_no_interstep_calibration_by_default():
    p = policy_from_dict({})
    assert p.fp8.allow_calibration_ops == []

def test_default_is_bf16():
    p = policy_from_dict({})
    assert p.mode == "bf16"

def test_custom_config():
    cfg = {
        "mode": "fp8_unified",
        "fp8": {
            "format": "E5M2",
            "allow_calibration_ops": ["foo"]
        }
    }
    p = policy_from_dict(cfg)
    assert p.mode == "fp8_unified"
    assert p.fp8.fmt == "E5M2"
    assert p.fp8.allow_calibration_ops == ["foo"]
