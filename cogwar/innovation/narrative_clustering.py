import os

FEATURE_FLAG = "COGWAR_INNOVATION"

def cluster_narratives(observations: list) -> list:
    if os.environ.get(FEATURE_FLAG, "false").lower() != "true":
        raise PermissionError(f"Feature {FEATURE_FLAG} is disabled.")

    return ["cluster_1"]
