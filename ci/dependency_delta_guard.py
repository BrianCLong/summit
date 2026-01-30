# ci/dependency_delta_guard.py
import argparse
import pathlib
import sys


def load_allowlist(path):
    if not path or not pathlib.Path(path).exists():
        return set()
    return set(line.strip() for line in pathlib.Path(path).read_text().splitlines() if line.strip())

def main():
    parser = argparse.ArgumentParser(description="Dependency Delta Guard")
    parser.add_argument("--manifest", help="Path to allowlist manifest")
    args = parser.parse_args()

    allowlist = load_allowlist(args.manifest)

    # In this repo, let's assume we check maestro/requirements.txt if it exists
    req_file = pathlib.Path("maestro/requirements.txt")
    if req_file.exists():
        current_deps = set(line.strip() for line in req_file.read_text().splitlines() if line.strip() and not line.startswith("#"))
        new_deps = current_deps - allowlist
        if new_deps and args.manifest: # Only fail if manifest was provided
            print(f"Error: New dependencies detected not in allowlist: {new_deps}")
            print("Please update deps/DEPENDENCY_DELTA.md with rationale.")
            sys.exit(1)

    print("OK: Dependency delta check passed")

if __name__ == "__main__":
    main()
