import json, sys, pathlib
from jsonschema import Draft202012Validator

def _load(p): return json.loads(pathlib.Path(p).read_text())

def main():
  root = pathlib.Path("evidence")
  idx = _load(root/"index.json")
  schemas = {
    "report": _load(root/"schemas/report.schema.json"),
    "metrics": _load(root/"schemas/metrics.schema.json"),
    "stamp": _load(root/"schemas/stamp.schema.json"),
  }
  for evd, files in idx.get("items", {}).items():
    for kind, rel in files.items():
      Draft202012Validator(schemas[kind]).validate(_load(root/rel))
  return 0

if __name__ == "__main__":
  raise SystemExit(main())
