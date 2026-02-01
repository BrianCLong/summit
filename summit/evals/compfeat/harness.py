import json
from summit.features.compfeat.engine import run_compfeat, CompFeatInput

def run_fixture(path: str) -> dict:
  with open(path, "r", encoding="utf-8") as f:
    payload = json.load(f)
  out = run_compfeat(CompFeatInput(raw=payload["input"]))
  return {"expected": payload["expected"], "got": {"status": out.status, "details": out.details}}
