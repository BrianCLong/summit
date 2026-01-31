#!/usr/bin/env python3
import json
import os
import sys

from jsonschema import Draft202012Validator


def load(p):
  try:
    with open(p, encoding="utf-8") as f:
        return json.load(f)
  except Exception as e:
    print(f"[EVIDENCE] Error loading {p}: {e}")
    sys.exit(1)

def validate(instance, schema_path, name="Artifact"):
  if not os.path.exists(schema_path):
      # Fallback to evidence/ROOT if not in evidence/schemas/
      alt_path = schema_path.replace("evidence/schemas/", "evidence/")
      if os.path.exists(alt_path):
          schema_path = alt_path
      else:
          print(f"[EVIDENCE] Schema not found: {schema_path}")
          return False

  schema = load(schema_path)
  v = Draft202012Validator(schema)
  errs = sorted(v.iter_errors(instance), key=lambda e: e.path)
  if errs:
    for e in errs:
        print(f"[EVIDENCE] {name} Error {list(e.path)}: {e.message}")
    return False
  print(f"[EVIDENCE] OK: {name}")
  return True

def check_no_timestamps(data, filename):
    """Recursively check for timestamp-like keys or values in data."""
    # This is a heuristic based on the requirement "timestamps only in stamp.json"
    # We will flag keys containing 'timestamp', 'date', 'created_at'

    FORBIDDEN_KEYS = {'timestamp', 'date', 'created_at', 'updated_at', 'time'}

    def walk(obj, path):
        errors = []
        if isinstance(obj, dict):
            for k, v in obj.items():
                if k.lower() in FORBIDDEN_KEYS:
                     errors.append(f"{path}.{k}")
                errors.extend(walk(v, f"{path}.{k}"))
        elif isinstance(obj, list):
            for i, v in enumerate(obj):
                errors.extend(walk(v, f"{path}[{i}]"))
        return errors

    errors = walk(data, "")
    if errors:
        print(f"[EVIDENCE] FAILED: {filename} contains forbidden timestamp fields: {errors}")
        print("[EVIDENCE] Timestamps must be confined to stamp.json.")
        return False
    return True

def main():
  # 1. Validate Index
  index_path = "evidence/index.json"
  if os.path.exists(index_path):
    index = load(index_path)
    if not validate(index, "evidence/schemas/index.schema.json", "Index"):
        return 1
  else:
    print(f"[EVIDENCE] Warning: {index_path} not found.")

  # 2. Validate Report
  report_path = "evidence/fixtures/report.ok.json" if "--fixture-ok" in sys.argv else "evidence/report.json"
  for arg in sys.argv:
    if arg.startswith("--report="):
        report_path = arg.split("=")[1]

  if os.path.exists(report_path):
      report = load(report_path)
      if not validate(report, "evidence/schemas/report.schema.json", f"Report ({report_path})"):
          return 2
      if not check_no_timestamps(report, report_path):
          return 3

  # 3. Validate Metrics if present
  # Try to deduce metrics path
  if "report" in os.path.basename(report_path):
      metrics_path = report_path.replace("report", "metrics")
      if os.path.exists(metrics_path):
          metrics = load(metrics_path)
          if not validate(metrics, "evidence/schemas/metrics.schema.json", f"Metrics ({metrics_path})"):
              return 2
          if not check_no_timestamps(metrics, metrics_path):
              return 3

  return 0

if __name__ == "__main__":
  sys.exit(main())
