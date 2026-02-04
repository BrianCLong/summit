import os

def is_enabled(flag_name: str, default: bool = False) -> bool:
    """Check if a feature flag is enabled via environment variables."""
    val = os.environ.get(flag_name, str(default)).lower()
    return val in ("true", "1", "yes", "on")

# Platform-wide flags
MULTIPRODUCT_ENABLED = is_enabled("MULTIPRODUCT_ENABLED", False)

# Product-specific flags
FACTFLOW_ENABLED = is_enabled("FACTFLOW_ENABLED", False)
FACTLAW_ENABLED = is_enabled("FACTLAW_ENABLED", False)
FACTMARKETS_ENABLED = is_enabled("FACTMARKETS_ENABLED", False)
FACTGOV_ENABLED = is_enabled("FACTGOV_ENABLED", False)
