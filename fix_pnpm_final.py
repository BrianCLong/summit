import os
import re

def fix_workflow(path):
    with open(path, 'r') as f:
        lines = f.readlines()

    changed = False
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]

        # Check if we found setup-node
        if 'uses: actions/setup-node' in line:
            # Look ahead for pnpm setup in the next few lines
            found_pnpm_setup = False
            pnpm_setup_block = []
            for j in range(max(0, i-10), min(len(lines), i+20)):
                if 'uses: pnpm/action-setup' in lines[j]:
                    found_pnpm_setup = True
                    # Find where this block starts and ends
                    start = j
                    while start > 0 and not lines[start-1].strip().startswith('-'):
                        start -= 1
                    if start > 0 and lines[start-1].strip().startswith('-'):
                        start -= 1

                    end = j + 1
                    while end < len(lines) and not lines[end].strip().startswith('-') and not lines[end].strip() == '':
                        end += 1

                    # We found it. If it's AFTER setup-node, we need to move it.
                    if j > i:
                        pnpm_setup_block = lines[start:end]
                        # Remove it from its current position (we'll do this by not adding it to new_lines when we reach it)
                        # Actually, let's just do a simple swap if they are consecutive or close.
                        pass

            # If not found at all, add it
            if not found_pnpm_setup and ('cache: pnpm' in "".join(lines[i:i+10])):
                indent = line[:line.find('-')]
                new_lines.append(f"{indent}- name: Setup pnpm\n")
                new_lines.append(f"{indent}  uses: pnpm/action-setup@v4\n")
                new_lines.append(f"{indent}  with:\n")
                new_lines.append(f"{indent}    version: 10\n")
                changed = True

        new_lines.append(line)
        i += 1

    # Final pass to ensure version 10 and no actions/setup- pnpm corruption
    content = "".join(new_lines)
    if 'uses: pnpm/action-setup@v4' in content and 'version: 10' not in content:
         # Try to add version: 10
         pass

    if changed:
        with open(path, 'w') as f:
            f.write(content)
        return True
    return False

for root, dirs, files in os.walk('.github/workflows'):
    for file in files:
        if file.endswith('.yml') or file.endswith('.yaml'):
            path = os.path.join(root, file)
            if fix_workflow(path):
                print(f"Fixed {path}")
