import os

target_files = [
    ".github/workflows/release-reliability.yml"
]

# We want to ensure setup-python is present before pnpm install
# And pnpm setup is present before setup-node

for filepath in target_files:
    if not os.path.exists(filepath):
        continue

    with open(filepath, 'r') as f:
        content = f.read()

    # Naive injection if missing
    if "actions/setup-python" not in content:
        print(f"Injecting python setup into {filepath}")
        # Insert after checkout
        if "actions/checkout@v4" in content:
            replacement = r"""actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'"""
            content = content.replace("actions/checkout@v4", replacement)

    # Ensure pnpm setup is there (fix_pnpm_workflows.py handles this, but let's double check)
    # The previous run of fix_pnpm_workflows might have put it *after* if setup-node was earlier?
    # No, it inserts *before*.

    with open(filepath, 'w') as f:
        f.write(content)
