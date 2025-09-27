import os, mlflow, torch
MODEL_URI = os.getenv("MODEL_URI")  # e.g., "runs:/<run_id>/graphsage_linkpred.pt"
_cache = None
def load_model():
    global _cache
    if _cache: return _cache
    local = mlflow.artifacts.download_artifacts(artifact_uri=MODEL_URI)
    state = torch.load(local, map_location="cpu")
    from app import ToyLP  # reuse or switch to SAGE class
    model = ToyLP(); model.load_state_dict(state); model.eval()
    _cache = model
    return model
