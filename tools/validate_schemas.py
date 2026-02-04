#!/usr/bin/env python3
import json
import pathlib
import sys

from jsonschema import Draft202012Validator


def main() -> int:
    root = pathlib.Path(__file__).resolve().parents[1]
    schema_dir = root / "schemas"
    if not schema_dir.exists():
        print("[FAIL] schemas directory missing", file=sys.stderr)
        return 1

    ok = True
    for path in sorted(schema_dir.rglob("*.schema.json")):
        schema = json.loads(path.read_text(encoding="utf-8"))
        try:
            Draft202012Validator.check_schema(schema)
        except Exception as exc:  # noqa: BLE001 - needed to report schema failures
            ok = False
            print(f"[FAIL] schema invalid: {path}: {exc}", file=sys.stderr)
        else:
            print(f"[OK] {path}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
