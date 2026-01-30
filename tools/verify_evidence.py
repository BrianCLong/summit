import json
import sys
from pathlib import Path

try:
    from jsonschema import ValidationError, validate
except ImportError:
    print("WARNING: jsonschema not installed. Skipping evidence validation.")
    sys.exit(0)

def validate_file(file_path: Path, schema_path: Path) -> bool:
    if not file_path.exists():
        print(f"SKIP: {file_path} not found")
        return True

    if not schema_path.exists():
        print(f"FAIL: Schema {schema_path} missing")
        return False

    print(f"Validating {file_path} against {schema_path}")
    try:
        data = json.loads(file_path.read_text(encoding="utf-8"))
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
        validate(instance=data, schema=schema)
        print(f"OK: {file_path.name} valid")
        return True
    except ValidationError as e:
        print(f"FAIL: {file_path.name} validation error: {e.message}")
        return False
    except Exception as e:
        print(f"FAIL: {file_path.name} error: {e}")
        return False

def main() -> int:
    evidence_dir = Path("evidence")
    schemas_dir = evidence_dir / "schemas"

    if not evidence_dir.exists():
        print("evidence/ missing")
        return 1

    if not schemas_dir.exists():
        print("evidence/schemas/ missing")
        return 1

    success = True

    # 1. Validate index.json
    if not validate_file(evidence_dir / "index.json", schemas_dir / "index.schema.json"):
        success = False

    # 2. Validate report.json
    if not validate_file(evidence_dir / "report.json", schemas_dir / "report.schema.json"):
        success = False

    # 3. Validate metrics.json
    if not validate_file(evidence_dir / "metrics.json", schemas_dir / "metrics.schema.json"):
        success = False

    # 4. Validate stamp.json
    if not validate_file(evidence_dir / "stamp.json", schemas_dir / "stamp.schema.json"):
        success = False

    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
