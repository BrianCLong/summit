from typing import Any, Dict

class PrecisionFlowPolicy:
    def __init__(self, cfg: Dict[str, Any]):
        self.cfg = cfg

def policy_from_dict(d: Dict[str, Any]) -> PrecisionFlowPolicy:
    return PrecisionFlowPolicy(d)

def test_policy_loading():
    cfg = {"type": "mixed_precision", "enabled": True}
    policy = policy_from_dict(cfg)
    assert policy is not None
