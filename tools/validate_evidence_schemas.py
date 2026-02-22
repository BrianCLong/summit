import json
from pathlib import Path

try:
    from jsonschema import Draft202012Validator
except ImportError:
    import sys
    print("jsonschema not found. Please install it with 'pip install jsonschema'.")
    sys.exit(1)

SCHEMAS = {
  "run_report": "evidence/schemas/run_report.schema.json",
  "run_metrics": "evidence/schemas/run_metrics.schema.json",
  "run_index": "evidence/schemas/run_index.schema.json",
}

def main() -> int:
  for name, sp in SCHEMAS.items():
    print(f"Validating {name} schema at {sp}...")
    try:
        schema_path = Path(sp)
        if not schema_path.exists():
            print(f"Error: Schema file {sp} not found.")
            return 1

        schema = json.loads(schema_path.read_text())
        Draft202012Validator.check_schema(schema)
        print(f"OK: {name} is valid.")
    except Exception as e:
        print(f"Error validating {name}: {e}")
        return 1
  return 0

if __name__ == "__main__":
  raise SystemExit(main())
