import os
import re

filepath = ".github/workflows/unit-test-coverage.yml"

with open(filepath, 'r') as f:
    content = f.read()

if "actions/setup-python" not in content:
    print(f"Adding setup-python to {filepath}")
    # Insert before setup-node or pnpm setup
    # Look for the checkout step, insert after it

    replacement = r"""- uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          cache: 'pip'"""

    # Simple replace
    new_content = content.replace("- uses: actions/checkout@v4", replacement)

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print("Fixed.")
    else:
        print("Could not insert setup-python")
else:
    print("setup-python already present")
