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
SIPL_ENABLED = is_feature_enabled("SIPL_ENABLED", default=False)
FEATURE_QWEN3_ASR = is_feature_enabled("FEATURE_QWEN3_ASR", default=False)
FEATURE_QWEN3_TTS = is_feature_enabled("FEATURE_QWEN3_TTS", default=False)
