# ci/verify_evidence_bundle.py
import json
import pathlib
import re
import sys

TIMESTAMP_REGEX = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}')

def scan_for_timestamps(data, path=""):
    if isinstance(data, dict):
        for k, v in data.items():
            scan_for_timestamps(v, f"{path}.{k}" if path else k)
    elif isinstance(data, list):
        for i, v in enumerate(data):
            scan_for_timestamps(v, f"{path}[{i}]")
    elif isinstance(data, str):
        if TIMESTAMP_REGEX.match(data):
            raise ValueError(f"Found timestamp in {path}: {data}. Timestamps are only allowed in stamp.json.")

def main():
    idx = pathlib.Path("evidence/index.json")
    if not idx.exists():
        print("Error: evidence/index.json not found")
        sys.exit(1)

    data = json.loads(idx.read_text())
    if "evidence" not in data or not isinstance(data["evidence"], dict):
        print("Error: evidence/index.json must contain an 'evidence' dictionary")
        sys.exit(1)

    # Requirement: only stamp.json can have timestamps
    evidence_dir = pathlib.Path("evidence")
    for evd_id, rel_path in data["evidence"].items():
        fpath = evidence_dir.parent / rel_path
        if fpath.name != "stamp.json" and fpath.suffix == ".json":
            try:
                content = json.loads(fpath.read_text())
                scan_for_timestamps(content, path=str(rel_path))
            except ValueError as e:
                print(f"Validation Error for {evd_id}: {e}")
                sys.exit(1)
            except Exception as e:
                print(f"Error reading {rel_path}: {e}")
                sys.exit(1)

    print("OK: evidence/index.json and artifacts validated")

if __name__ == "__main__":
    main()
