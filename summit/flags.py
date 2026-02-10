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

# Incremental Graph Update Flags (Lane 1)
INCR_UPDATES = is_feature_enabled("INCR_UPDATES", default=False)
DELTA_EXTRACT = is_feature_enabled("DELTA_EXTRACT", default=False)
DELTA_APPLY = is_feature_enabled("DELTA_APPLY", default=False)
INDEX_HOOKS = is_feature_enabled("INDEX_HOOKS", default=False)

# Incremental Graph Update Flags (Lane 2 - OFF)
INCR_REEMBED = is_feature_enabled("INCR_REEMBED", default=False)
ADAPTIVE_DELTAS = is_feature_enabled("ADAPTIVE_DELTAS", default=False)
