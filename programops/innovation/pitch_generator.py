import os

FEATURE_FLAG = "FEATURE_PROGRAMOPS_GENERATOR"

def generate_pitch():
    if os.environ.get(FEATURE_FLAG) != "1":
        raise RuntimeError(f"Feature {FEATURE_FLAG} is disabled.")
    return "Pitch generated."
