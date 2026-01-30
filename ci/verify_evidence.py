import json
import sys
from pathlib import Path
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]
EVID = ROOT / "evidence"
SCHEMAS = EVID / "schemas"

def _load(p: Path):
    if not p.exists():
        print(f"[error] File not found: {p}")
        sys.exit(2)
    return json.loads(p.read_text(encoding="utf-8"))

def validate(instance_path: Path, schema_path: Path) -> None:
    try:
        inst = _load(instance_path)
        schema = _load(schema_path)
        v = Draft202012Validator(schema)
        errs = sorted(v.iter_errors(inst), key=lambda e: e.path)
        if errs:
            for e in errs[:50]:
                print(f"[schema-error] {instance_path.name}: {e.message} at {list(e.path)}")
            raise SystemExit(2)
    except Exception as e:
        print(f"[error] Validation failed for {instance_path.name}: {e}")
        raise SystemExit(2)

def main():
    validate(EVID/"index.json", SCHEMAS/"evidence.index.schema.json")
    validate(EVID/"report.json", SCHEMAS/"evidence.report.schema.json")
    validate(EVID/"metrics.json", SCHEMAS/"evidence.metrics.schema.json")
    print("evidence schema validation: OK")

if __name__ == "__main__":
    main()
