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

# Graph Merge flags
SUMMIT_GRAPH_MERGE = is_feature_enabled("SUMMIT_GRAPH_MERGE", default=False)
SUMMIT_GRAPH_MERGE_TWO_WAY = is_feature_enabled("SUMMIT_GRAPH_MERGE_TWO_WAY", default=False)
SUMMIT_GRAPH_MERGE_MULTI_WAY = is_feature_enabled("SUMMIT_GRAPH_MERGE_MULTI_WAY", default=False)
SUMMIT_GRAPH_MERGE_DISTRIBUTED = is_feature_enabled("SUMMIT_GRAPH_MERGE_DISTRIBUTED", default=False)
