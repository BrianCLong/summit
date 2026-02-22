import os

def is_self_evolve_enabled() -> bool:
    return os.environ.get("SUMMIT_SELF_EVOLVE", "0") == "1"
