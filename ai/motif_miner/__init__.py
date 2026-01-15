import os

from .miner import MiningConfig, MotifMiner, SimpleGraph

FEATURE_FLAG = "MOTIF_MINER_ENABLED"


def is_enabled() -> bool:
    return os.getenv(FEATURE_FLAG, "false").lower() in {"1", "true", "yes", "on"}


__all__ = ["FEATURE_FLAG", "MiningConfig", "MotifMiner", "SimpleGraph", "is_enabled"]
