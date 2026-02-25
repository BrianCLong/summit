#!/usr/bin/env bash
set -euo pipefail

# Evidence Contract Gate
# Validates Moltbook Relay evidence artifacts against schemas
# Ensures timestamps are ONLY in stamp.json

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 required" >&2
  exit 1
fi

python3 - <<'PY'
import json
import os
import sys
from pathlib import Path

try:
    from jsonschema import Draft202012Validator
except ImportError:
    print("jsonschema not found, skipping deep validation")
    Draft202012Validator = None

def load_json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)

def validate(instance, schema_path):
    if not Draft202012Validator:
        return True
    schema = load_json(schema_path)
    v = Draft202012Validator(schema)
    errors = sorted(v.iter_errors(instance), key=lambda e: e.path)
    if errors:
        for e in errors:
            print(f"Validation error in {list(e.path)}: {e.message}")
        return False
    return True

def check_no_timestamps(data, path=""):
    FORBIDDEN = {'timestamp', 'date', 'created_at', 'updated_at', 'time', 'generated_at_utc'}
    errors = []
    if isinstance(data, dict):
        for k, v in data.items():
            if k.lower() in FORBIDDEN:
                errors.append(f"{path}.{k}" if path else k)
            errors.extend(check_no_timestamps(v, f"{path}.{k}" if path else k))
    elif isinstance(data, list):
        for i, v in enumerate(data):
            errors.extend(check_no_timestamps(v, f"{path}[{i}]"))
    return errors

def process_single_report(report, report_path):
    evidence_id = report.get("evidence_id", "")
    if "moltbook-relay" in evidence_id:
        schema = "evidence/schemas/moltbook-relay-report.schema.json"
    else:
        schema = "evidence/schemas/report.schema.json"

    if not os.path.exists(schema):
        pass

    if os.path.exists(schema):
        if not validate(report, schema):
            print(f"FAILED schema validation: {report_path} (ID: {evidence_id})")
            return False

    ts_errors = check_no_timestamps(report)
    if ts_errors:
        print(f"FAILED timestamp check: {report_path} contains forbidden fields: {ts_errors}")
        return False

    return True

def process_evidence(report_path):
    print(f"Checking evidence: {report_path}")
    try:
        data = load_json(report_path)
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON {report_path}: {e}")
        return False

    reports = []
    if isinstance(data, list):
        reports = data
    elif isinstance(data, dict):
        reports = [data]
    else:
        print(f"Error: {report_path} root is not list or dict")
        return False

    all_valid = True
    for idx, report in enumerate(reports):
        if not isinstance(report, dict):
            continue

        if not process_single_report(report, report_path):
            all_valid = False

    metrics_path = report_path.replace("report.json", "metrics.json")
    if os.path.exists(metrics_path):
        try:
            metrics_data = load_json(metrics_path)
            m_items = metrics_data if isinstance(metrics_data, list) else [metrics_data]
            for m_item in m_items:
                 if isinstance(m_item, dict):
                     ts_errors = check_no_timestamps(m_item)
                     if ts_errors:
                         print(f"FAILED timestamp check: {metrics_path} contains forbidden fields: {ts_errors}")
                         all_valid = False
        except Exception as e:
            print(f"Error checking metrics {metrics_path}: {e}")
            all_valid = False

    return all_valid

evidence_dir = Path("evidence")
found_any = False
success = True

for p in evidence_dir.rglob("report.json"):
    found_any = True
    if not process_evidence(str(p)):
        success = False

if not found_any:
    print("No evidence reports found to validate.")

if not success:
    sys.exit(1)

print("All evidence contracts verified.")
PY
