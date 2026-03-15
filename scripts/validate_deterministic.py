import json
import os
import glob
from pathlib import Path

def validate_json_file(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Try parsing
    data = json.loads(content)

    # Rewrite with deterministic sorting and indent
    deterministic_content = json.dumps(data, sort_keys=True, indent=2) + "\n"

    if content != deterministic_content:
        print(f"Fixing sorting and trailing newline in {file_path}")
        with open(file_path, 'w') as f:
            f.write(deterministic_content)
        return False
    return True

def main():
    files = glob.glob('GOLDEN/datasets/**/*.json', recursive=True)
    fixed_count = 0
    for file in files:
        if not validate_json_file(file):
            fixed_count += 1

    if fixed_count > 0:
        print(f"Fixed {fixed_count} files for deterministic output.")
    else:
        print("All JSON files are deterministically formatted.")

if __name__ == "__main__":
    main()
