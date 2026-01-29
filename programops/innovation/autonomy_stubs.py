import os

FEATURE_FLAG = "FEATURE_AUTONOMY_PITCH"

def integration_stub():
    if os.environ.get(FEATURE_FLAG) != "1":
        raise RuntimeError(f"Feature {FEATURE_FLAG} is disabled.")
    return "Autonomy integration stub active."
