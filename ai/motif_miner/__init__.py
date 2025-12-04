import os
from .miner import MotifMiner, MiningConfig, SimpleGraph

FEATURE_FLAG = "MOTIF_MINER_ENABLED"

def is_enabled() -> bool:
    return os.getenv(FEATURE_FLAG, "false").lower() in {"1", "true", "yes", "on"}

__all__ = ["MotifMiner", "MiningConfig", "SimpleGraph", "is_enabled", "FEATURE_FLAG"]
