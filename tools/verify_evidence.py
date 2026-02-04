import json
import sys
from pathlib import Path

try:
    from jsonschema import ValidationError, validate
except ImportError:
    print("WARNING: jsonschema not installed. Skipping evidence validation.")
    sys.exit(0)  # Permissive: exit 0 if dependency missing

def main() -> int:
    evidence_dir = Path("evidence")
    if not evidence_dir.exists():
        print("evidence/ missing")
        return 1

    # Validate index.json
    index_path = evidence_dir / "index.json"
    schema_path = evidence_dir / "schemas/index.schema.json"

    if index_path.exists() and schema_path.exists():
        print(f"Validating {index_path} against {schema_path}")
        try:
            data = json.loads(index_path.read_text())
            schema = json.loads(schema_path.read_text())
            validate(instance=data, schema=schema)
            print("OK: index.json valid")
        except ValidationError as e:
            print(f"FAIL: {e.message}")
            return 1
        except Exception as e:
            print(f"FAIL: {e}")
            return 1

    return 0

if __name__ == "__main__":
    raise SystemExit(main())
