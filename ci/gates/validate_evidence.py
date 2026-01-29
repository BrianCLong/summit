#!/usr/bin/env python3
import json, sys
from jsonschema import Draft202012Validator

def load(p):
  with open(p,"r",encoding="utf-8") as f: return json.load(f)

def main():
  schema = load("evidence/report.schema.json")
  # Use fixture if specified, else look for generated report
  report_path = "evidence/fixtures/report.ok.json" if "--fixture-ok" in sys.argv else "evidence/report.json"

  # Allow overriding path
  for arg in sys.argv:
    if arg.startswith("--report="):
        report_path = arg.split("=")[1]

  try:
    report = load(report_path)
  except FileNotFoundError:
    print(f"[EVIDENCE] Error: Report file not found at {report_path}")
    return 1

  v = Draft202012Validator(schema)
  errs = sorted(v.iter_errors(report), key=lambda e: e.path)
  if errs:
    for e in errs: print(f"[EVIDENCE] {list(e.path)}: {e.message}")
    return 2
  print(f"[EVIDENCE] OK: {report_path}")
  return 0

if __name__ == "__main__":
  raise SystemExit(main())
