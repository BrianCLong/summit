import re

with open("scripts/generate-sbom.sh", "r") as f:
    content = f.read()
    print("Content Length:", len(content))
    # Look for syft output arguments
    match = re.search(r'syft .* --output (\S+)', content)
    if match:
        print(f"Syft Output Arg: {match.group(1)}")
    else:
        # Check for positional args or variable usage
        print("No direct --output flag found. Checking for artifact path usage.")
        if "artifacts/sbom" in content:
            print("Found 'artifacts/sbom' reference.")
