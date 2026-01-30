import random
from dataclasses import dataclass


@dataclass(frozen=True)
class InKGRPOConfig:
    rho: float = 0.2        # prob apply CE aux loss
    lambda_ce: float = 0.1  # CE weight when active
    feature_flag_env: str = "TY_S_INK_GRPO"

def ink_grpo_apply_aux(rng: random.Random, rho: float) -> bool:
    return rng.random() < rho
