import argparse
import json
import sys
from pathlib import Path

try:
    from jsonschema import RefResolver, validate
except ImportError:
    print("jsonschema not found.")
    sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Verify CogWar Evidence Bundle")
    parser.add_argument("bundle_dir", type=Path, help="Path to evidence bundle directory")
    args = parser.parse_args()

    bundle_dir = args.bundle_dir
    index_path = bundle_dir / "evidence" / "index.json"

    if not index_path.exists():
        # Maybe it's directly in bundle_dir?
        index_path = bundle_dir / "index.json"

    if not index_path.exists():
        print(f"Error: index.json not found in {bundle_dir}")
        return 1

    print(f"Loading index from {index_path}")
    try:
        index = json.loads(index_path.read_text())
    except json.JSONDecodeError as e:
        print(f"Error decoding index.json: {e}")
        return 1

    # Load all schemas to resolve refs
    schema_dir = Path("cogwar/schemas").absolute()
    schema_store = {}
    for p in schema_dir.glob("*.schema.json"):
        try:
            schema = json.loads(p.read_text())
            schema_store[p.name] = schema
        except Exception:
            pass

    # Use report.schema.json as referrer if available, else generic
    referrer = schema_store.get("report.schema.json", {})
    resolver = RefResolver(base_uri=f"{schema_dir.as_uri()}/", referrer=referrer, store=schema_store)

    success = True

    # Validate each CogWar item
    for item in index.get("evidence", []):
        evd_id = item.get("evidence_id", "")
        if not evd_id.startswith("EVD-COGDOMAIN-"):
            continue

        path_str = item.get("path", "")
        item_path = bundle_dir / path_str

        print(f"Verifying {evd_id} at {item_path}")

        if not item_path.exists():
            print(f"  Error: Path {item_path} does not exist")
            success = False
            continue

        # Check report.json
        report_path = item_path / "report.json"
        if report_path.exists():
            try:
                report_data = json.loads(report_path.read_text())
                report_schema = schema_store.get("report.schema.json")
                if report_schema:
                     validate(instance=report_data, schema=report_schema, resolver=resolver)
                     print("  report.json: Valid")
                else:
                    print("  report.json: Schema not found")
            except Exception as e:
                print(f"  report.json: Invalid ({e})")
                success = False

        # Check metrics.json
        metrics_path = item_path / "metrics.json"
        if metrics_path.exists():
            try:
                metrics_data = json.loads(metrics_path.read_text())
                metrics_schema = schema_store.get("metrics.schema.json")
                if metrics_schema:
                     validate(instance=metrics_data, schema=metrics_schema, resolver=resolver)
                     print("  metrics.json: Valid")
            except Exception as e:
                print(f"  metrics.json: Invalid ({e})")
                success = False

        # Check stamp.json
        stamp_path = item_path / "stamp.json"
        if not stamp_path.exists():
             print("  stamp.json: Missing")
             success = False
        else:
             print("  stamp.json: Found")

    if success:
        print("Verification Successful")
        return 0
    else:
        print("Verification Failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
