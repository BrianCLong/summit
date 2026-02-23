import yaml

# Since preserving comments and structure in YAML with standard libs is hard,
# I will use string replacement for specific blocks if possible, or just edit the file content logically.

with open('.github/workflows/ci-verify.yml', 'r') as f:
    content = f.read()

# Fix 3: Remove empty 'with:' after pnpm/action-setup if I failed earlier
# Actually my previous sed might have worked or failed depending on implementation.
# Let's clean up any empty 'with:' lines?
lines = content.splitlines()
new_lines = []
skip_next = False
for i, line in enumerate(lines):
    if skip_next:
        skip_next = False
        continue

    # Check for empty 'with:' after pnpm/action-setup
    # Assuming standard indentation
    if line.strip() == 'with:' and 'pnpm/action-setup' in lines[i-1]:
        # Check if next line is dedented or empty or starts with '-' (new step)
        if i+1 < len(lines):
            next_line = lines[i+1]
            if next_line.strip().startswith('-') or len(next_line) - len(next_line.lstrip()) <= len(line) - len(line.lstrip()):
                # It was empty 'with:', skip it
                continue
            # If next line is indented, it means there are params.
            # But I removed 'version: 9' line already?
            # Let's check.
            pass

    # Fix 5: Provenance job missing pnpm
    if 'name: Provenance & SBOM' in line:
        # We are in the provenance job.
        # Find steps.
        # We need to inject pnpm/action-setup
        pass

    # Actually, let's use string replace for the specific block in Provenance & SBOM
    # The block is:
    #   provenance:
    #     name: Provenance & SBOM
    #     runs-on: ubuntu-22.04
    #     steps:
    #       - uses: actions/checkout@v4 # v6
    #       - uses: actions/setup-node@v4 # v6
    #         with:
    #           node-version: "20"
    #       - uses: actions/setup-node@v4 # v6
    #         with:
    #           node-version: "20"
    #           cache: pnpm

    # We want to replace it with:
    #   provenance:
    #     name: Provenance & SBOM
    #     runs-on: ubuntu-22.04
    #     steps:
    #       - uses: actions/checkout@v4 # v6
    #       - uses: pnpm/action-setup@v4 # v4
    #       - uses: actions/setup-node@v4 # v6
    #         with:
    #           node-version: "20"
    #           cache: pnpm

    new_lines.append(line)

# Let's just do targeted replacement on the full string for Provenance job
content = '\n'.join(new_lines)
block_to_replace = """  provenance:
    name: Provenance & SBOM
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4 # v6
      - uses: actions/setup-node@v4 # v6
        with:
          node-version: "20"
      - uses: actions/setup-node@v4 # v6
        with:
          node-version: "20"
          cache: pnpm"""

replacement = """  provenance:
    name: Provenance & SBOM
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4 # v6
      - uses: pnpm/action-setup@v4 # v4
      - uses: actions/setup-node@v4 # v6
        with:
          node-version: "20"
          cache: pnpm"""

if block_to_replace in content:
    content = content.replace(block_to_replace, replacement)
else:
    # Maybe indentation is different or comments?
    # Let's try to match loosely or use sed/line processing for this.
    pass

with open('.github/workflows/ci-verify.yml', 'w') as f:
    f.write(content)
