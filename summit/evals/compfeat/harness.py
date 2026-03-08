import json

from summit.features.compfeat.engine import CompFeatInput, run_compfeat


def run_fixture(path: str) -> dict:
  with open(path, encoding="utf-8") as f:
    payload = json.load(f)
  out = run_compfeat(CompFeatInput(raw=payload["input"]))
  return {"expected": payload["expected"], "got": {"status": out.status, "details": out.details}}
