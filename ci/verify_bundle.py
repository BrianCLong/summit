import json
import os
import subprocess
import sys


def validate_schemas(manifest):
    print("Checking schemas...")
    for schema_path in manifest.get("schemas", []):
        if not os.path.exists(schema_path):
            print(f"FAILED: Schema not found: {schema_path}")
            return False
        print(f"  OK: {schema_path}")
    return True

def run_tests():
    print("Running unit tests...")
    try:
        # Run all vmworkbench tests
        cmd = [sys.executable, "-m", "unittest", "discover", "-s", "tests/vmworkbench", "-p", "test_*.py"]
        env = os.environ.copy()
        env["PYTHONPATH"] = env.get("PYTHONPATH", "") + ":" + os.getcwd()
        subprocess.run(cmd, env=env, check=True)
        print("  OK: All tests passed")
        return True
    except subprocess.CalledProcessError:
        print("FAILED: Unit tests failed")
        return False

def main():
    manifest_path = "bundle/manifest.vmworkbench.json"
    if not os.path.exists(manifest_path):
        print(f"FAILED: Manifest not found: {manifest_path}")
        sys.exit(1)

    with open(manifest_path) as f:
        manifest = json.load(f)

    success = True
    if not validate_schemas(manifest):
        success = False

    if not run_tests():
        success = False

    if not success:
        sys.exit(1)

    print("Bundle verification PASSED")

if __name__ == "__main__":
    main()
