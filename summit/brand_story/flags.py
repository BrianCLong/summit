import os

def enabled() -> bool:
    """Check if brand story features are enabled."""
    return os.getenv("BRAND_STORY_ENABLED", "false").lower() == "true"
