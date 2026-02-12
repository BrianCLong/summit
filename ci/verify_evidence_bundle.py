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
    items = data.get("items") or data.get("evidence")
    if not isinstance(items, dict):
        print("Error: evidence/index.json must contain an 'items' or 'evidence' dictionary")
        sys.exit(1)

    # Requirement: only stamp.json can have timestamps
    root_dir = idx.parent.parent
    for evd_id, meta in items.items():
        # Handle different item formats
        file_paths = []
        if isinstance(meta, str):
            file_paths = [meta]
        elif isinstance(meta, dict) and "files" in meta:
            files = meta["files"]
            if isinstance(files, dict):
                file_paths = list(files.values())
            elif isinstance(files, list):
                file_paths = files

        for fp in file_paths:
            fpath = root_dir / fp
            if fpath.name != "stamp.json" and fpath.suffix == ".json" and fpath.exists():
                try:
                    content = json.loads(fpath.read_text())
                    scan_for_timestamps(content, path=str(fp))
                except ValueError as e:
                    print(f"Validation Error for {evd_id}: {e}")
                    sys.exit(1)
                except Exception as e:
                    print(f"Error reading {fp}: {e}")
                    sys.exit(1)

    print("OK: evidence/index.json and artifacts validated")

if __name__ == "__main__":
    main()
