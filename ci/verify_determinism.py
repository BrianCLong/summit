import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE_DIR = ROOT / "evidence"

def check_no_timestamps(path: Path):
    content = path.read_text(encoding="utf-8")
    # Match YYYY-MM-DDTHH:MM:SS
    pattern = r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}"
    if re.search(pattern, content):
        return False
    return True

def main():
    success = True
    print("Verifying determinism...")

    for json_file in EVIDENCE_DIR.glob("**/*.json"):
        rel_path = json_file.relative_to(ROOT)
        path_str = str(json_file)

        # Only check ATLAS specific files or index.json
        # Also check the schemas I created.
        is_atlas = "ATLAS" in path_str.upper() or json_file.name == "index.json"

        # Check my specific schemas
        if "evidence/schemas/evidence." in path_str or "transfer_matrix.schema.json" in path_str:
            is_atlas = True

        # Stamp file is exempt from timestamp check
        is_stamp = "stamp.json" in json_file.name

        # Rule 1: No timestamps outside stamp.json
        if not is_stamp and not check_no_timestamps(json_file):
            msg = f"Timestamp found in {rel_path}"
            if is_atlas:
                print(f"FAILED: {msg}")
                success = False
            else:
                pass # print(f"WARNING: {msg}")

        # Rule 2: Stable-key sorted
        try:
            content = json_file.read_text(encoding="utf-8")
            data = json.loads(content)
            sorted_content = json.dumps(data, sort_keys=True, indent=2)

            if content.strip() != sorted_content.strip():
                msg = f"{rel_path} is not stable-key sorted or has wrong formatting"
                if is_atlas:
                    print(f"FAILED: {msg}")
                    # Debug:
                    # print(f"Expected:\n{sorted_content[:100]}...")
                    # print(f"Got:\n{content[:100]}...")
                    success = False
                else:
                    pass
        except Exception as e:
            print(f"Error checking {rel_path}: {e}")
            if is_atlas:
                success = False

    if success:
        print("PASSED: Determinism checks")
        sys.exit(0)
    else:
        print("FAILED: Determinism checks")
        sys.exit(1)

if __name__ == "__main__":
    main()
