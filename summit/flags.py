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
SUMMIT_AGENTKIT_ENABLED = is_feature_enabled("SUMMIT_AGENTKIT_ENABLED", default=False)
SUMMIT_TOOLS_ENABLED = is_feature_enabled("SUMMIT_TOOLS_ENABLED", default=False)
SUMMIT_TYPED_OUTPUTS = is_feature_enabled("SUMMIT_TYPED_OUTPUTS", default=False)
SUMMIT_EVALS_ENABLED = is_feature_enabled("SUMMIT_EVALS_ENABLED", default=False)
SUMMIT_EXPERIMENTAL = is_feature_enabled("SUMMIT_EXPERIMENTAL", default=False)
