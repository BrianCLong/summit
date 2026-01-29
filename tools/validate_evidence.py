import json
import sys
import argparse
from pathlib import Path
import jsonschema

def load_schema(name):
    # Assumes running from repo root
    schema_path = Path("evidence/schemas") / f"{name}.schema.json"
    if not schema_path.exists():
        print(f"Schema {name} not found at {schema_path}")
        sys.exit(1)
    with open(schema_path) as f:
        return json.load(f)

def validate_file(filepath, schema_name):
    if not filepath.exists():
        print(f"File {filepath} does not exist.")
        return False

    try:
        with open(filepath) as f:
            data = json.load(f)

        schema = load_schema(schema_name)
        jsonschema.validate(instance=data, schema=schema)
        # print(f"Valid: {filepath}")
        return True
    except jsonschema.exceptions.ValidationError as e:
        print(f"Validation error in {filepath}: {e.message}")
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Validate Summit Evidence")
    parser.add_argument("index_path", nargs="?", default="evidence/index.json", help="Path to evidence index file")
    args = parser.parse_args()

    index_path = Path(args.index_path)
    if not index_path.exists():
        print(f"Index file {index_path} not found.")
        sys.exit(1)

    print(f"Validating evidence index: {index_path}")

    # Validate index itself
    if not validate_file(index_path, "index"):
        print("Index validation failed.")
        sys.exit(1)

    with open(index_path) as f:
        index_data = json.load(f)

    all_valid = True

    # Base directory for resolving relative paths in index (relative to the index file location)
    base_dir = index_path.parent

    for item in index_data.get("items", []):
        evidence_id = item.get("evidence_id")
        relative_dir = item.get("dir")

        evidence_dir = base_dir / relative_dir
        print(f"Checking evidence {evidence_id} in {evidence_dir}...")

        if not evidence_dir.exists():
            print(f"  Directory {evidence_dir} not found.")
            all_valid = False
            continue

        if not validate_file(evidence_dir / "report.json", "report"):
            all_valid = False
        if not validate_file(evidence_dir / "metrics.json", "metrics"):
            all_valid = False
        if not validate_file(evidence_dir / "stamp.json", "stamp"):
            all_valid = False

    if all_valid:
        print("All evidence valid.")
        sys.exit(0)
    else:
        print("Validation failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
