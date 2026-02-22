import os

def is_feature_enabled(name, default=False):
    val = os.environ.get(name, str(default)).lower()
    return val in ("true", "1", "t", "yes", "y")

# Current Feature Flags
FEATURE_AUTH_V2 = is_feature_enabled("FEATURE_AUTH_V2", default=True)
FEATURE_CHAT_GATEWAY = is_feature_enabled("FEATURE_CHAT_GATEWAY", default=True)
ATLAS_PLANNER_ENABLED = is_feature_enabled("ATLAS_PLANNER_ENABLED", default=False)
SUMMIT_SCOUTS_ENABLED = is_feature_enabled("SUMMIT_SCOUTS_ENABLED", default=False)
SIPL_ENABLED = is_feature_enabled("SIPL_ENABLED", default=False)
FEATURE_QWEN3_ASR = is_feature_enabled("FEATURE_QWEN3_ASR", default=False)
FEATURE_QWEN3_TTS = is_feature_enabled("FEATURE_QWEN3_TTS", default=False)
REDIS_CACHE_ENABLED = is_feature_enabled("REDIS_CACHE_ENABLED", default=True)