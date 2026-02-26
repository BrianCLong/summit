import os
import re

def fix_workflow(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Remove 'version: 9.12.0' and similar under 'pnpm/action-setup'
    # We look for 'pnpm/action-setup' and then remove the 'version:' line in its 'with:' block

    lines = content.splitlines()
    new_lines = []
    in_action_setup = False

    for line in lines:
        if 'uses: pnpm/action-setup' in line:
            in_action_setup = True
            new_lines.append(line)
            continue

        if in_action_setup:
            if 'version:' in line:
                continue
            if line.strip().startswith('-') or (line.strip() and not line.startswith(' ' * 8)):
                in_action_setup = False

        new_lines.append(line)

    fixed = '\n'.join(new_lines)
    if fixed != content:
        with open(filepath, 'w') as f:
            f.write(fixed)
        return True
    return False

for root, _, files in os.walk('.github/workflows'):
    if '.archive' in root: continue
    for file in files:
        if file.endswith('.yml') or file.endswith('.yaml'):
            if fix_workflow(os.path.join(root, file)):
                print(f"Fixed pnpm version in {os.path.join(root, file)}")

fix_workflow('.github/actions/setup-pnpm/action.yml')
