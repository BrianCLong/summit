import os
import re

WORKFLOWS_DIR = ".github/workflows"

def fix_workflow_file(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()

    # Pass 1: Remove 'with: version: ...' for pnpm/action-setup
    # and Identify step indices for swapping

    new_lines = []
    i = 0
    pnpm_setup_indices = []
    node_setup_indices = []

    # We will reconstruct the file content first, removing version configuration
    while i < len(lines):
        line = lines[i]

        if "uses: pnpm/action-setup" in line:
            # Check if previous line was also pnpm/action-setup (duplicate removal)
            if new_lines and "uses: pnpm/action-setup" in new_lines[-1] and line.strip() == new_lines[-1].strip():
                # Skip duplicate
                i += 1
                continue

            new_lines.append(line)
            i += 1

            # Check for 'with:' block immediately following
            if i < len(lines) and lines[i].strip().startswith("with:"):
                # Check inside 'with:' block
                with_start = i
                i += 1
                keep_with = False
                with_lines = []

                while i < len(lines):
                    curr_line = lines[i]
                    # Check indentation to determine if still in 'with' block
                    indent = len(curr_line) - len(curr_line.lstrip())
                    base_indent = len(lines[with_start]) - len(lines[with_start].lstrip())

                    if not curr_line.strip(): # Empty line
                        with_lines.append(curr_line)
                        i += 1
                        continue

                    if indent <= base_indent:
                        # End of with block
                        break

                    if "version:" in curr_line:
                        # Skip version line
                        pass
                    else:
                        keep_with = True
                        with_lines.append(curr_line)
                    i += 1

                if keep_with:
                    new_lines.append(lines[with_start]) # 'with:'
                    new_lines.extend(with_lines)

        elif "uses: rhysd/actionlint-action" in line:
            # Fix actionlint name
            new_lines.append(line.replace("rhysd/actionlint-action", "ravbaker/actionlint-action"))
            i += 1

        else:
            new_lines.append(line)
            i += 1

    # Pass 2: Re-order steps if necessary
    # This is complex because we need to parse steps structure.
    # Instead, we'll do a simple heuristic: if "Setup Node" with "cache: pnpm" appears BEFORE "Setup pnpm" in the same job, swap them.
    # This requires parsing jobs and steps.
    # For now, let's just apply the file changes from Pass 1, and assume I manually fix soc-controls and gate.

    with open(filepath, 'w') as f:
        f.writelines(new_lines)

def manual_fixes():
    # semver-label.yml: remove cache: pnpm
    semver_path = os.path.join(WORKFLOWS_DIR, "semver-label.yml")
    if os.path.exists(semver_path):
        with open(semver_path, 'r') as f:
            content = f.read()
        if 'cache: "pnpm"' in content:
            content = content.replace('cache: "pnpm"', '')
            # Remove empty lines left behind if any, simplified
            with open(semver_path, 'w') as f:
                f.write(content)

    # soc-controls.yml: Swap steps (simple string replacement if pattern matches)
    soc_path = os.path.join(WORKFLOWS_DIR, "soc-controls.yml")
    if os.path.exists(soc_path):
        with open(soc_path, 'r') as f:
            content = f.read()

        # Pattern for wrong order
        wrong_order = """      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'
      - name: Setup pnpm
        uses: pnpm/action-setup@v4"""

        correct_order = """      - name: Setup pnpm
        uses: pnpm/action-setup@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'"""

        if wrong_order in content:
            content = content.replace(wrong_order, correct_order)
            with open(soc_path, 'w') as f:
                f.write(content)

    # gate.yml: Swap steps
    gate_path = os.path.join(WORKFLOWS_DIR, "gate.yml")
    if os.path.exists(gate_path):
        with open(gate_path, 'r') as f:
            content = f.read()

        wrong_order_gate = """      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'
      - name: Setup pnpm
        uses: pnpm/action-setup@v4"""

        correct_order_gate = """      - name: Setup pnpm
        uses: pnpm/action-setup@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'"""

        if wrong_order_gate in content:
            content = content.replace(wrong_order_gate, correct_order_gate)
            with open(gate_path, 'w') as f:
                f.write(content)

for root, dirs, files in os.walk(WORKFLOWS_DIR):
    for file in files:
        if file.endswith(".yml") or file.endswith(".yaml"):
            fix_workflow_file(os.path.join(root, file))

manual_fixes()
