import os
import re

WORKFLOWS_DIR = ".github/workflows"

def fix_file_content(content, filename):
    lines = content.splitlines(keepends=True)
    new_lines = []
    i = 0

    while i < len(lines):
        line = lines[i]

        # Deduplicate pnpm/action-setup
        if "uses: pnpm/action-setup" in line:
            if new_lines and "uses: pnpm/action-setup" in new_lines[-1] and line.strip() == new_lines[-1].strip():
                i += 1
                continue

        # Fix actionlint name
        if "uses: rhysd/actionlint-action" in line:
            line = line.replace("rhysd/actionlint-action", "ravbaker/actionlint-action")

        if "uses: pnpm/action-setup" in line:
            new_lines.append(line)
            i += 1

            # Check for 'with:' block
            if i < len(lines) and lines[i].strip().startswith("with:"):
                with_start = i
                temp_with_lines = []
                j = i + 1
                has_other_keys = False

                with_indent = len(lines[i]) - len(lines[i].lstrip())

                while j < len(lines):
                    next_line = lines[j]
                    if not next_line.strip():
                        temp_with_lines.append(next_line)
                        j += 1
                        continue

                    next_indent = len(next_line) - len(next_line.lstrip())
                    if next_indent <= with_indent:
                        break

                    if "version:" in next_line:
                        # Skip version
                        pass
                    else:
                        has_other_keys = True
                        temp_with_lines.append(next_line)
                    j += 1

                if has_other_keys:
                    new_lines.append(lines[with_start])
                    new_lines.extend(temp_with_lines)

                i = j
                continue
        else:
            new_lines.append(line)
            i += 1

    content = "".join(new_lines)

    if filename == "semver-label.yml":
        if 'cache: "pnpm"' in content:
            content = content.replace('cache: "pnpm"', '')

    # Check for wrong order of setup-node and pnpm/action-setup
    # Pattern: setup-node (with cache: pnpm) ... then ... pnpm/action-setup
    # We'll use a specific replacement for known files to be safe

    if filename in ["soc-controls.yml", "gate.yml"]:
        wrong_block = """      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'
      - name: Setup pnpm
        uses: pnpm/action-setup@v4"""

        correct_block = """      - name: Setup pnpm
        uses: pnpm/action-setup@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'"""

        # Normalize indentation for detection (simplified)
        if wrong_block in content:
            content = content.replace(wrong_block, correct_block)

    # Also check gate.yml specific indentation or variations if any

    # Remove empty with: blocks if any left
    content = re.sub(r'(\s+)with:\s*\n(\s+)(\n|$)', r'\n', content)

    return content

for root, dirs, files in os.walk(WORKFLOWS_DIR):
    for file in files:
        if file.endswith(".yml") or file.endswith(".yaml"):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()

            new_content = fix_file_content(content, file)

            if content != new_content:
                print(f"Fixing {file}")
                with open(path, 'w') as f:
                    f.write(new_content)
