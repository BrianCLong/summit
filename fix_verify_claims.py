import os

def fix_workflow(filepath, fix_pnpm_version=False, inject_python=False):
    with open(filepath, "r") as f:
        content = f.read()

    lines = content.splitlines()
    new_lines = []

    pnpm_setup = [
        "      - uses: pnpm/action-setup@v4",
        "        with:",
        "          version: 9.12.0"
    ]

    python_setup = [
        "      - uses: actions/setup-python@v5",
        "        with:",
        "          python-version: '3.11'",
        "          cache: 'pip'"
    ]

    pnpm_inserted = False

    for i, line in enumerate(lines):
        stripped = line.strip()
        indent = line[:len(line) - len(stripped)]

        # Fix specific version 10.0.0 issue in verify-claims.yml
        if fix_pnpm_version and "version: \"10.0.0\"" in stripped:
             new_lines.append(indent + "version: \"9.12.0\"")
             continue

        # Insert pnpm setup before setup-node for verify-claims.yml which has order issues
        if "uses: actions/setup-node" in stripped:
             # Check if pnpm setup is already immediately before or after
             # The existing file has setup-node BEFORE pnpm-setup. We want pnpm-setup BEFORE setup-node.
             # If we see setup-node, we insert pnpm setup if not already seen in this job block.
             # BUT verify-claims.yml has pnpm setup AFTER. We need to remove the later one if we insert here.
             # Simpler approach: Just insert pnpm setup here. If duplicate exists later, we might need to remove it manually or handle it.
             # For verify-claims, we will overwrite the whole file content to be safe as logic is complex.
             pass

        new_lines.append(line)

    if fix_pnpm_version:
        # Specialized overwrite for verify-claims.yml
        pass

    # We will just write specific content for verify-claims.yml as it is short

files_to_fix = [
    ".github/workflows/verify-claims.yml"
]

# verify-claims.yml fix content
verify_claims_content = """name: Verify Narrative Claims

on:
  push:
    branches: [main, master, develop]
  pull_request:
    branches: [main, master, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  validate-claims:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4 # v6

      - uses: pnpm/action-setup@v4
        with:
          version: 9.12.0

      - uses: actions/setup-node@v4 # v6
        with:
          cache: 'pnpm'
          node-version: "20"

      - run: pnpm install --frozen-lockfile
      - run: pnpm exec tsx scripts/governance/validate_claims.ts
"""

with open(".github/workflows/verify-claims.yml", "w") as f:
    f.write(verify_claims_content)

print("Fixed .github/workflows/verify-claims.yml")
