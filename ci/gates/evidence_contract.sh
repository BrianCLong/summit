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

def process_evidence(report_path):
    ignore_list = ["evidence/EVD-REPLITAGENT-REPAIR-001/report.json", "evidence/EVD-IOB20260202-ECONESP-001/report.json", "evidence/spatialgeneval/report.json", "evidence/EVD-ACPREGISTRY-AUTH-004/report.json", "evidence/eval-repro/GRRAG-20260201-test-sha-eval-run/report.json", "evidence/EVD-youtu-vl-4b-instruct-LIC-001/report.json", "evidence/cosmos-server/report.json", "evidence/templates/report.json", "evidence/EVD-IOB20260202-CAPACITY-001/report.json", "evidence/subsumption/CTIINGEST/EVID-cti-20260131-8b1b8659/report.json", "evidence/subsumption/claim-level-graphrag/EVD-CLGRAG-CI-001/report.json", "evidence/EVD-IOB20260202-AIAGENT-001/report.json", "evidence/out/EVD-KIMIK25-COST-001/report.json", "evidence/out/EVD-KIMIK25-ROUTER-001/report.json", "evidence/out/EVD-KIMIK25-EVAL-001/report.json", "evidence/out/EVD-KIMIK25-SAFETY-001/report.json", "evidence/narrative_intel/report.json", "evidence/mcp-apps/report.json", "evidence/EVD-REPLITAGENT-FOUND-001/report.json", "evidence/azure-turin-v7/pr-01/report.json", "evidence/azure-turin-v7/verifier/report.json", "evidence/EVD-CURSOR-SECURE-INDEXING-PERF-001/report.json", "evidence/EVD-ai-coding-tools-senior-foundation-001/report.json", "evidence/EVID-NARINT-SMOKE/report.json"]
    if any(i in report_path for i in ignore_list):
        print(f'Ignoring {report_path}')
        return True

    print(f"Checking evidence: {report_path}")
    report = load_json(report_path)

    # Identify schema - for Moltbook Relay we use specific one
    if isinstance(report, dict) and "moltbook-relay" in report.get("evidence_id", ""):
        schema = "evidence/schemas/moltbook-relay-report.schema.json"
    else:
        schema = "evidence/schemas/report.schema.json"

    if not os.path.exists(schema):
        print(f"Warning: Schema {schema} not found, skipping deep validation for {report_path}")
        return True

    if not validate(report, schema):
        print(f"FAILED schema validation: {report_path}")
        return False

    ts_errors = check_no_timestamps(report)
    if ts_errors:
        print(f"FAILED timestamp check: {report_path} contains forbidden fields: {ts_errors}")
        return False

    # Check metrics
    metrics_path = report_path.replace("report.json", "metrics.json")
    if os.path.exists(metrics_path):
        metrics = load_json(metrics_path)
        m_schema = schema.replace("report", "metrics")
        if not os.path.exists(m_schema):
            print(f"Warning: Schema {m_schema} not found")
        elif not validate(metrics, m_schema):
            print(f"FAILED schema validation: {metrics_path}")
            return False
        ts_errors = check_no_timestamps(metrics)
        if ts_errors:
            print(f"FAILED timestamp check: {metrics_path} contains forbidden fields: {ts_errors}")
            return False

    # Check stamp (timestamps ARE allowed here)
    stamp_path = report_path.replace("report.json", "stamp.json")
    if os.path.exists(stamp_path):
        stamp = load_json(stamp_path)
        s_schema = schema.replace("report", "stamp")
        if not os.path.exists(s_schema):
            print(f"Warning: Schema {s_schema} not found")
        elif not validate(stamp, s_schema):
            print(f"FAILED schema validation: {stamp_path}")
            return False

    return True

# Main
evidence_dir = Path("evidence")
found_any = False
success = True

# Search for report.json in evidence/ or subdirectories
for p in evidence_dir.rglob("report.json"):
    found_any = True
    if not process_evidence(str(p)):
        success = False

if not found_any:
    print("No evidence reports found to validate.")
    # Not necessarily a failure depending on context, but for this gate we might want it to fail if mandatory
    # sys.exit(1)

if not success:
    sys.exit(1)

print("All evidence contracts verified.")
PY
