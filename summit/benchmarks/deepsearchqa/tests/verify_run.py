import json
import re
import sys
from pathlib import Path


def validate(instance, schema, context=""):
    # Simple manual validation based on schema
    for req in schema.get("required", []):
        if req not in instance:
            raise ValueError(f"{context}: Missing required field: {req}")

    for key, val in instance.items():
        prop = schema.get("properties", {}).get(key)
        if prop:
            ptype = prop.get("type")
            if ptype == "string" and not isinstance(val, str):
                raise ValueError(f"{context}.{key}: Field must be string")
            if ptype == "array" and not isinstance(val, list):
                raise ValueError(f"{context}.{key}: Field must be list")
            if ptype == "object" and not isinstance(val, dict):
                raise ValueError(f"{context}.{key}: Field must be dict")
            pattern = prop.get("pattern")
            if pattern and isinstance(val, str) and not re.match(pattern, val):
                raise ValueError(f"{context}.{key}: Value '{val}' does not match pattern {pattern}")
        elif schema.get("additionalProperties") is False:
             raise ValueError(f"{context}: Unexpected field '{key}'")

def run_validation():
    try:
        base_dir = Path("summit/benchmarks/deepsearchqa")
        schema_dir = base_dir / "evidence" / "schemas"
        run_dir = Path("evidence/deepsearchqa-run")

        print(f"Validating evidence in {run_dir} against schemas in {schema_dir}")

        report = json.loads((run_dir / "report.json").read_text())
        metrics = json.loads((run_dir / "metrics.json").read_text())
        stamp = json.loads((run_dir / "stamp.json").read_text())
        index = json.loads((run_dir / "index.json").read_text())

        validate(report, json.loads((schema_dir / "report.schema.json").read_text()), "report")
        validate(metrics, json.loads((schema_dir / "metrics.schema.json").read_text()), "metrics")
        validate(stamp, json.loads((schema_dir / "stamp.schema.json").read_text()), "stamp")
        validate(index, json.loads((schema_dir / "index.schema.json").read_text()), "index")

        # Check for timestamps outside stamp.json
        for f in ["report.json", "metrics.json"]:
            content = (run_dir / f).read_text()
            if re.search(r'202\d-\d{2}-\d{2}', content):
                 raise ValueError(f"{f}: Contains a timestamp. Timestamps must ONLY be in stamp.json")

        print("End-to-end evidence verification SUCCESS!")
    except Exception as e:
        print(f"End-to-end evidence verification FAILED: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_validation()
