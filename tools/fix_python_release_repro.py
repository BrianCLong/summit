import os

# Files that need Python 3.11 setup to avoid node-gyp/python 3.12 issues
target_files = [
    ".github/workflows/repro-build-check.yml",
    ".github/workflows/release-reliability.yml"
]

replacement = r"""- uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          cache: 'pip'"""

for filepath in target_files:
    if not os.path.exists(filepath):
        continue

    with open(filepath, 'r') as f:
        content = f.read()

    if "actions/setup-python" not in content:
        print(f"Adding setup-python to {filepath}")
        new_content = content.replace("- uses: actions/checkout@v4", replacement)

        if new_content != content:
            with open(filepath, 'w') as f:
                f.write(new_content)
            print("Fixed.")
        else:
            print("Could not insert setup-python (no checkout step found?)")
    else:
        print(f"setup-python already present in {filepath}")
