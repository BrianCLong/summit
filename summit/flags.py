import os


def is_feature_enabled(name: str, default: bool = False) -> bool:
    val = os.environ.get(name)
    if val is None:
        return default
    return val.lower() in ("1", "true", "yes", "on")

FEATURE_SOUL_MD = is_feature_enabled("FEATURE_SOUL_MD", default=False)
FEATURE_CHAT_GATEWAY = is_feature_enabled("FEATURE_CHAT_GATEWAY", default=False)
ATLAS_PLANNER_ENABLED = is_feature_enabled("ATLAS_PLANNER_ENABLED", default=False)
SUMMIT_SCOUTS_ENABLED = is_feature_enabled("SUMMIT_SCOUTS_ENABLED", default=False)
SUMMIT_VIND_ENABLED = is_feature_enabled("SUMMIT_VIND_ENABLED", default=False)

# IO Pipeline Flags
SUMMIT_IO_PIPELINE = is_feature_enabled("SUMMIT_IO_PIPELINE", default=False)
IO_PRAVDA_ENABLED = is_feature_enabled("IO_PRAVDA_ENABLED", default=False)
IO_CONTRADICTION_ENABLED = is_feature_enabled("IO_CONTRADICTION_ENABLED", default=False)
IO_ASSETPAIR_ENABLED = is_feature_enabled("IO_ASSETPAIR_ENABLED", default=False)
IO_INAUTH_ENABLED = is_feature_enabled("IO_INAUTH_ENABLED", default=False)
IO_LLMGUARD_ENABLED = is_feature_enabled("IO_LLMGUARD_ENABLED", default=False)
