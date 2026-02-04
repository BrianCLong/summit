#!/usr/bin/env python3
import json
import sys
import os
from pathlib import Path
try:
    from jsonschema import Draft202012Validator, ValidationError
except ImportError:
    print("jsonschema not installed. Please install it with 'pip install jsonschema'", file=sys.stderr)
    sys.exit(1)

# Default paths
ROOT = Path(os.environ.get("EVIDENCE_ROOT", Path(__file__).resolve().parents[1]))
EVIDENCE_DIR = ROOT / "evidence"
SCHEMAS_DIR = Path(os.environ.get("SCHEMAS_DIR", ROOT / "schemas" / "evidence"))

INDEX_FILE = EVIDENCE_DIR / "index.json"
INDEX_SCHEMA = SCHEMAS_DIR / "index.schema.json"

def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"Error loading {path}: {exc}", file=sys.stderr)
        raise

def check_no_timestamps(data: dict | list, filename: str) -> bool:
    FORBIDDEN_KEYS = {'timestamp', 'date', 'created_at', 'updated_at', 'time'}
    # Allow timestamps in stamp.json
    if filename.endswith("stamp.json"):
        return True

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
        print(f"[FAIL] {filename} contains forbidden timestamp fields: {errors}", file=sys.stderr)
        return False
    return True

def validate_artifact(path: Path, schema_path: Path, strict: bool = False) -> bool:
    if not path.exists():
        msg = f"Artifact not found: {path}"
        if strict:
            print(f"[FAIL] {msg}", file=sys.stderr)
            return False
        else:
            print(f"[WARN] {msg}", file=sys.stderr)
            return True

    try:
        data = load_json(path)
    except:
        if strict: return False
        return True

    if not check_no_timestamps(data, path.name):
        if strict: return False
        # If not strict, we still might want to fail on timestamps?
        # Plan says "timestamps only in stamp.json".
        # Let's keep it failing for timestamps as that's a security/compliance rule.
        return False

    if schema_path.exists():
        try:
            schema = load_json(schema_path)
            Draft202012Validator(schema).validate(data)
            print(f"[PASS] {path.name} validates against {schema_path.name}")
        except ValidationError as e:
            msg = f"{path.name} validation error: {e.message}"
            if strict:
                print(f"[FAIL] {msg}", file=sys.stderr)
                return False
            else:
                print(f"[WARN] {msg}", file=sys.stderr)
                return True
    else:
        print(f"[WARN] Schema not found: {schema_path}", file=sys.stderr)

    return True

def main() -> int:
    args = sys.argv[1:]
    strict = "--strict" in args
    if strict:
        args.remove("--strict")

    index_path_arg = args[0] if args else str(INDEX_FILE)
    index_path = Path(index_path_arg)

    if not index_path.exists():
        print(f"Index file not found: {index_path}", file=sys.stderr)
        return 1

    print(f"Validating index: {index_path}")
    try:
        index_data = load_json(index_path)
    except:
        return 1

    # Validate index against schema
    if INDEX_SCHEMA.exists():
        try:
            index_schema = load_json(INDEX_SCHEMA)
            Draft202012Validator(index_schema).validate(index_data)
            print("[PASS] Index validates against schema")
        except ValidationError as e:
            print(f"[FAIL] Index validation error: {e.message}", file=sys.stderr)
            return 1
    else:
        print(f"[WARN] Index schema not found: {INDEX_SCHEMA}", file=sys.stderr)

    items = index_data.get("items", {})
    if not isinstance(items, dict):
        print("[FAIL] 'items' must be a dictionary/object", file=sys.stderr)
        return 1

    failed = False
    for evid, entry in items.items():
        files = entry.get("files") or entry.get("artifacts") or []
        if not files:
            # Warning only
            # print(f"[WARN] Entry {evid} has no files/artifacts")
            continue

        for fpath in files:
            # Files are usually relative to repo root
            artifact_path = ROOT / fpath
            if not artifact_path.exists() and not os.path.isabs(fpath):
                 # Try relative to evidence dir if not found at root?
                 # evidence/index.json usually has "evidence/report.json" which means from root.
                 pass

            # Determine schema
            schema_name = "report.schema.json"
            if "metrics" in fpath:
                schema_name = "metrics.schema.json"
            elif "stamp" in fpath:
                schema_name = "stamp.schema.json"

            schema_path = SCHEMAS_DIR / schema_name
            if not validate_artifact(artifact_path, schema_path, strict=strict):
                failed = True

    return 1 if failed else 0

if __name__ == "__main__":
    sys.exit(main())
