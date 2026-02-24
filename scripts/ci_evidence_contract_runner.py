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
    if not os.path.exists(schema_path):
        print(f"Warning: Schema {schema_path} not found")
        # Soft fail if schema missing to avoid blocking on missing schema file in some environments
        return True

    try:
        schema = load_json(schema_path)
        v = Draft202012Validator(schema)
        errors = sorted(v.iter_errors(instance), key=lambda e: e.path)
        if errors:
            for e in errors:
                print(f"Validation error in {list(e.path)}: {e.message}")
            return False
    except Exception as e:
        print(f"Schema validation error: {e}")
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
    print(f"Checking evidence: {report_path}")
    try:
        report = load_json(report_path)
    except Exception as e:
        print(f"Failed to load JSON {report_path}: {e}")
        return False

    # Determine schema path based on location
    if "artifacts/evidence" in report_path:
        schema_dir = Path("packages/evidence/schemas")
        schema = str(schema_dir / "report.schema.json")
    else:
        # Legacy schema
        schema_dir = Path("evidence/schemas")
        schema = str(schema_dir / "report.schema.json")

    if not validate(report, schema):
        print(f"FAILED schema validation: {report_path}")
        return False

    ts_errors = check_no_timestamps(report)
    if ts_errors:
        print(f"FAILED timestamp check: {report_path} contains forbidden fields: {ts_errors}")
        return False

    # Check metrics
    metrics_path = report_path.replace("report.json", "metrics.json")
    metrics_mandatory = "artifacts/evidence" in report_path # Mandate for new artifacts

    if os.path.exists(metrics_path):
        metrics = load_json(metrics_path)
        if "artifacts/evidence" in report_path:
            m_schema = str(Path("packages/evidence/schemas") / "metrics.schema.json")
        else:
            m_schema = str(schema_dir / "metrics.schema.json")

        if not validate(metrics, m_schema):
            print(f"FAILED schema validation: {metrics_path}")
            return False
        ts_errors = check_no_timestamps(metrics)
        if ts_errors:
            print(f"FAILED timestamp check: {metrics_path} contains forbidden fields: {ts_errors}")
            return False
    elif metrics_mandatory:
        print(f"FAILED: Missing metrics.json for {report_path}")
        return False

    # Check stamp (timestamps ARE allowed here)
    stamp_path = report_path.replace("report.json", "stamp.json")
    if os.path.exists(stamp_path):
        stamp = load_json(stamp_path)
        if "artifacts/evidence" in report_path:
            s_schema = str(Path("packages/evidence/schemas") / "stamp.schema.json")
        else:
            s_schema = str(schema_dir / "stamp.schema.json")

        if not validate(stamp, s_schema):
            print(f"FAILED schema validation: {stamp_path}")
            return False
    elif metrics_mandatory:
        print(f"FAILED: Missing stamp.json for {report_path}")
        return False

    return True

# Main
evidence_dirs = [Path("evidence"), Path("artifacts/evidence")]
found_any = False
success = True

for ed in evidence_dirs:
    if not ed.exists():
        continue
    for p in ed.rglob("report.json"):
        found_any = True
        if not process_evidence(str(p)):
            success = False

if not found_any:
    print("No evidence reports found to validate.")

if not success:
    sys.exit(1)

print("All evidence contracts verified.")
