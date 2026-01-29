import os

class PolicyViolation(Exception):
    """Raised when a policy check fails."""
    pass

def check_global_kill_switch():
    """Deny execution unless globally enabled."""
    if os.environ.get("SUMMIT_TTT_DISCOVER_ENABLED") != "1":
        raise PolicyViolation("TTT Discover is disabled. Set SUMMIT_TTT_DISCOVER_ENABLED=1.")

def check_training_allowed():
    """Deny training unless explicitly enabled via environment variable."""
    if os.environ.get("SUMMIT_TTT_TRAINING_ENABLED") != "1":
        raise PolicyViolation("Training is not enabled. Set SUMMIT_TTT_TRAINING_ENABLED=1.")

def check_external_network():
    """Deny external network access."""
    # This is a stub for a real network check, but acts as the gate.
    raise PolicyViolation("External network access is forbidden in TTT loop.")

def check_path_write_allowed(path: str):
    """Deny writing to paths outside of sanctioned run directories."""
    # Normalize path
    normalized_path = os.path.normpath(path)

    # Allowed prefixes
    allowed = ["runs/", "/tmp", "evidence/"]

    is_allowed = False
    for prefix in allowed:
        if prefix in normalized_path:
            is_allowed = True
            break

    if not is_allowed:
        raise PolicyViolation(f"Writing to {path} is not allowed. Allowed paths must contain: {allowed}")
