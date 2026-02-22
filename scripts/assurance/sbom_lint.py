import json
import sys
import os

def lint_sbom(filepath):
    if not os.path.exists(filepath):
        print(f"Error: File {filepath} not found.")
        return False

    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error: Failed to parse JSON: {e}")
        return False

    # Check for mandatory SPDX fields
    required_fields = ['spdxVersion', 'SPDXID', 'name', 'documentNamespace', 'creationInfo', 'packages']
    for field in required_fields:
        if field not in data:
            print(f"Error: Missing mandatory field '{field}'")
            return False

    # Check for determinism (no timestamps in creationInfo other than the fixed one)
    expected_date = '2026-01-23T00:00:00Z'
    if data['creationInfo'].get('created') != expected_date:
        print(f"Error: Non-deterministic timestamp found: {data['creationInfo'].get('created')}. Expected {expected_date}")
        return False

    # Check that packages are sorted by name
    package_names = [p['name'] for p in data['packages'] if p['SPDXID'] != 'SPDXRef-RootPackage']
    if package_names != sorted(package_names):
        print("Error: Packages are not sorted alphabetically by name.")
        return False

    print(f"SBOM {filepath} passed linting.")
    return True

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "dist/assurance/sbom/summit.spdx.json"
    if not lint_sbom(path):
        sys.exit(1)
