import argparse
import json
import sys
from pathlib import Path

import jsonschema


def validate(instance_path, schema_path, is_jsonl=False):
    try:
        schema = json.loads(Path(schema_path).read_text(encoding="utf-8"))
    except Exception as e:
        print(f"Error reading schema {schema_path}: {e}")
        return False

    try:
        if is_jsonl:
            with open(instance_path, encoding="utf-8") as f:
                for i, line in enumerate(f):
                    if not line.strip(): continue
                    try:
                        item = json.loads(line)
                        jsonschema.validate(instance=item, schema=schema)
                    except jsonschema.ValidationError as e:
                        print(f"Validation failed for line {i+1} in {instance_path}: {e.message}")
                        return False
                    except json.JSONDecodeError as e:
                        print(f"JSON decode error line {i+1} in {instance_path}: {e}")
                        return False
        else:
            instance = json.loads(Path(instance_path).read_text(encoding="utf-8"))
            jsonschema.validate(instance=instance, schema=schema)

        print(f"PASS: {instance_path} valid against {schema_path}")
        return True
    except jsonschema.ValidationError as e:
        print(f"Validation failed for {instance_path}: {e.message}")
        return False
    except Exception as e:
        print(f"Error validating {instance_path}: {e}")
        return False

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--instance", required=True)
    parser.add_argument("--schema", required=True)
    parser.add_argument("--jsonl", action="store_true")
    args = parser.parse_args()

    success = validate(args.instance, args.schema, args.jsonl)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
