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
ENABLE_OCR2_VLLM_EXPERIMENTAL = is_feature_enabled("ENABLE_OCR2_VLLM_EXPERIMENTAL", default=False)
ENABLE_MS_SWIFT_INTEGRATION = is_feature_enabled("ENABLE_MS_SWIFT_INTEGRATION", default=False)
