import hashlib
import json
import os
import re
import sys
from pathlib import Path


def _sha256_file(p: str) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()

def verify_bundle(bundle_dir: str) -> None:
    bundle_path = Path(bundle_dir)
    idx_path = bundle_path / "evidence" / "index.json"

    if not idx_path.exists():
        raise RuntimeError(f"Index file missing: {idx_path}")

    try:
        idx = json.loads(idx_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Index JSON decode failed: {e}")

    # Check files listed in index
    for rel, expected in idx.get("files", {}).items():
        # Handle relative paths: keys in index are like "report.json"
        # files are at bundle root

        file_path = bundle_path / rel
        if not file_path.exists():
            raise RuntimeError(f"Required file missing: {rel}")

        actual = _sha256_file(str(file_path))
        if actual != expected:
            raise RuntimeError(f"Hash mismatch for {rel}: expected {expected}, got {actual}")

        # Check for timestamps (except stamp.json)
        if rel != "stamp.json" and "stamp" not in rel:
             content = file_path.read_text(encoding="utf-8")
             # Simple ISO8601 regex
             if re.search(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', content):
                 raise RuntimeError(f"Forbidden timestamp found in {rel}")

    print(f"evidence_verified: {idx.get('evidence_id', 'unknown')}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: verify.py <bundle_dir>")
        sys.exit(1)
    try:
        verify_bundle(sys.argv[1])
    except Exception as e:
        print(f"Verification failed: {e}")
        sys.exit(1)
