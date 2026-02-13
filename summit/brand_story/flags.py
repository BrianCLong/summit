import os

def enabled() -> bool:
    return os.getenv("BRAND_STORY_ENABLED", "false").lower() == "true"
