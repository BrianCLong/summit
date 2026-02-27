import os
import re

files_to_fix = [
    ".github/workflows/repro-docker.yml",
    ".github/workflows/_reusable-toolchain-setup.yml",
    ".github/workflows/_reusable-node-pnpm-setup.yml",
    ".github/workflows/reusable/security.yml",
    ".github/workflows/reusable/unit.yml",
    ".github/workflows/reusable/build-test.yml",
    ".github/workflows/reusable/package.yml",
    ".github/workflows/reusable/e2e.yml",
    ".github/workflows/reusable/smoke.yml",
    ".github/workflows/release-train.yml",
    ".github/workflows/_reusable-setup.yml",
    ".github/workflows/golden-path/_golden-path-pipeline.yml",
    ".github/workflows/disinfo.yml"
]

for filepath in files_to_fix:
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            content = f.read()

        # Replace 9.12.0 with 10.0.0
        new_content = content.replace("9.12.0", "10.0.0")

        if content != new_content:
            with open(filepath, 'w') as f:
                f.write(new_content)
            print(f"Fixed {filepath}")
        else:
            print(f"No changes needed for {filepath}")
    else:
        print(f"File not found: {filepath}")
