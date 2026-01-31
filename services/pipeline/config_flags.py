import os


def is_gnn_prioritizer_enabled() -> bool:
    return os.getenv("FEATURE_PRIORITIZER_GNN", "false").lower() == "true"

def is_explainability_required() -> bool:
    return os.getenv("FEATURE_EXPLAINABILITY_REQUIRED", "false").lower() == "true"
