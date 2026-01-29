#!/usr/bin/env python3
import argparse
import json
import sys
import re
from pathlib import Path
from typing import Any

try:
    from jsonschema import validate, ValidationError
except ImportError:
    print("Error: jsonschema module not found.")
    sys.exit(1)

# Schema paths relative to repo root (assuming script runs from root or we find root)
ROOT_DIR = Path(__file__).resolve().parents[1]
SCHEMA_DIR = ROOT_DIR / "evidence/schemas"

SCHEMAS = {
    "index": SCHEMA_DIR / "osint_index.schema.json",
    "report": SCHEMA_DIR / "osint_report.schema.json",
    "metrics": SCHEMA_DIR / "osint_metrics.schema.json",
    "stamp": SCHEMA_DIR / "osint_stamp.schema.json",
}

def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"FAIL: Could not read JSON from {path}: {e}")
        return None

def check_determinism(path: Path) -> bool:
    # Enforce indent=2, sort_keys=True
    try:
        content = path.read_text(encoding="utf-8").strip()
        data = json.loads(content)
        # We need to mimic the exact formatting of json.dump(..., indent=2, sort_keys=True)
        # Note: json.dumps adds a trailing newline? No, usually not.
        # But text editors might.
        # Let's be strict about the JSON serialization part.
        expected = json.dumps(data, indent=2, sort_keys=True)

        # Determine if content matches expected
        # To handle potential trailing newline differences, we strip both
        if content != expected:
             print(f"FAIL: Determinism check failed for {path.name} (keys not sorted or wrong indent)")
             return False
        return True
    except Exception as e:
        print(f"FAIL: Could not check determinism for {path}: {e}")
        return False

def validate_schema(data: Any, schema_path: Path) -> bool:
    if not schema_path.exists():
        print(f"FAIL: Schema file not found: {schema_path}")
        return False
    try:
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
        validate(instance=data, schema=schema)
        return True
    except ValidationError as e:
        print(f"FAIL: Schema validation failed for {schema_path.name}: {e.message}")
        return False
    except Exception as e:
        print(f"FAIL: Could not load schema {schema_path}: {e}")
        return False

def check_timestamps(path: Path) -> bool:
    # Deny ISO 8601 like strings: 202X-XX-XXTXX:XX:XX
    # Simple regex for 202[0-9] followed by hyphen
    try:
        content = path.read_text(encoding="utf-8")
        # Look for something that looks like a date-time (e.g., "2024-")
        # Removed leading quote to catch timestamps inside strings or keys
        if re.search(r'202[0-9]-[0-1][0-9]-[0-3][0-9]T', content):
             print(f"FAIL: Timestamp found in {path.name} (only allowed in stamp.json)")
             return False
        return True
    except Exception as e:
        print(f"FAIL: Could not read {path} for timestamp check: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Verify OSINT evidence bundle")
    parser.add_argument("bundle_dir", type=Path, help="Path to evidence bundle directory")
    args = parser.parse_args()

    bundle_dir = args.bundle_dir
    if not bundle_dir.exists():
        print(f"FAIL: Bundle directory {bundle_dir} does not exist")
        sys.exit(1)

    # 1. Check existence of required files
    evidence_dir = bundle_dir / "evidence"
    index_path = evidence_dir / "index.json"
    report_path = bundle_dir / "report.json"
    metrics_path = bundle_dir / "metrics.json"
    stamp_path = bundle_dir / "stamp.json"

    required_files = [index_path, report_path, metrics_path, stamp_path]
    missing = [p for p in required_files if not p.exists()]
    if missing:
        print(f"FAIL: Missing required files: {[str(p) for p in missing]}")
        sys.exit(1)

    # 2. Validate schemas
    success = True

    # Index
    print(f"Validating index.json...")
    index_data = load_json(index_path)
    if index_data and validate_schema(index_data, SCHEMAS["index"]):
        print("PASS: index.json valid")
        if not check_determinism(index_path):
            success = False
        # Check referenced files
        if "evidence" in index_data:
            for item in index_data["evidence"]:
                path_str = item.get("path")
                if path_str:
                    item_path = bundle_dir / path_str
                    if not item_path.exists():
                         print(f"FAIL: Evidence path not found: {item_path}")
                         success = False
    else:
        success = False

    # Report
    print(f"Validating report.json...")
    report_data = load_json(report_path)
    if report_data:
        if validate_schema(report_data, SCHEMAS["report"]):
            print("PASS: report.json valid")
            if not check_timestamps(report_path):
                success = False
            if not check_determinism(report_path):
                success = False
        else:
            success = False
    else:
        success = False

    # Metrics
    print(f"Validating metrics.json...")
    metrics_data = load_json(metrics_path)
    if metrics_data:
        if validate_schema(metrics_data, SCHEMAS["metrics"]):
            print("PASS: metrics.json valid")
            if not check_timestamps(metrics_path):
                success = False
            if not check_determinism(metrics_path):
                success = False
        else:
             success = False
    else:
        success = False

    # Stamp
    print(f"Validating stamp.json...")
    stamp_data = load_json(stamp_path)
    if stamp_data:
        if validate_schema(stamp_data, SCHEMAS["stamp"]):
            print("PASS: stamp.json valid")
            if not check_determinism(stamp_path):
                success = False
        else:
            success = False
    else:
        success = False

    if success:
        print("ALL CHECKS PASSED")
        sys.exit(0)
    else:
        print("SOME CHECKS FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()
