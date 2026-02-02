import os

def enabled() -> bool:
    """
    Check if the Brand Story module is enabled.
    Default to False for safety.
    """
    return os.getenv("BRAND_STORY_ENABLED", "false").lower() == "true"
