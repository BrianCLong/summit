"""
SIPL: Sequence-Improving Pretraining Loop (feature-flagged).
Clean-room implementation inspired by arXiv:2601.21343.
"""

from dataclasses import dataclass

@dataclass(frozen=True)
class SIPLConfig:
    enabled: bool = False
    suffix_len: int = 128
    rollouts: int = 4
    update_rule: str = "online_dpo"  # or "rf_nll"

def run_sipl(config: SIPLConfig, stream) -> dict:
    """
    Return dict with paths to evidence artifacts.
    TODO: implement candidate pool, judging, updates, and evidence emit.
    """
    if not config.enabled:
        return {"skipped": True}
    raise NotImplementedError("SIPL not wired yet")
