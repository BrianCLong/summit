#!/usr/bin/env python3
import json, sys, pathlib

# ROOT is 2 levels up from tools/ci/
ROOT = pathlib.Path(__file__).resolve().parents[2]

def validate_against_schema(data, schema_path, filename):
    if not schema_path.exists():
        # Schemas might not exist for all types yet, or might be elsewhere.
        # But for report, metrics, stamp they should exist as I created them.
        # If schema missing, maybe warn but don't fail? Or fail if strict.
        # Given I created them, I expect them to exist.
        print(f"Schema not found: {schema_path}", file=sys.stderr)
        return False
    try:
        schema = json.loads(schema_path.read_text())
    except json.JSONDecodeError:
        print(f"Invalid schema JSON: {schema_path}", file=sys.stderr)
        return False

    required = schema.get("required", [])
    missing = [f for f in required if f not in data]
    if missing:
        print(f"File {filename} missing required fields: {missing}", file=sys.stderr)
        return False
    return True

def main() -> int:
  idx = ROOT / "evidence" / "index.json"
  if not idx.exists():
    print("missing evidence/index.json", file=sys.stderr)
    return 1
  try:
    data = json.loads(idx.read_text())
  except json.JSONDecodeError:
    print("evidence/index.json is not valid JSON", file=sys.stderr)
    return 1

  items = data.get("items")
  if items is None:
      print("index.json missing 'items' list", file=sys.stderr)
      return 1

  # Validate referenced files exist and match schema
  failed = False
  for item in items:
      for key in ["report", "metrics", "stamp"]:
          if key in item:
              path = ROOT / item[key]
              if not path.exists():
                  print(f"Missing referenced file: {item[key]} for {item.get('evidence_id')}", file=sys.stderr)
                  failed = True
              else:
                  # Basic schema validation
                  schema_path = ROOT / "schemas" / "evidence" / f"{key}.schema.json"
                  try:
                      content = json.loads(path.read_text())
                      if not validate_against_schema(content, schema_path, item[key]):
                          failed = True
                  except json.JSONDecodeError:
                      print(f"Invalid JSON in file: {item[key]}", file=sys.stderr)
                      failed = True

  if failed:
      return 1
  return 0

if __name__ == "__main__":
  raise SystemExit(main())
