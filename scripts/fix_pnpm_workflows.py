import os
import re

def fix_workflow(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Check if pnpm is used
    if 'pnpm' not in content and 'cache: pnpm' not in content:
        return

    # Check if pnpm/action-setup is already present
    if 'pnpm/action-setup' in content:
        return

    # Find where to insert. Ideally before actions/setup-node
    if 'actions/setup-node' in content:
        # Naive insertion: find the line with uses: actions/setup-node and insert before it
        lines = content.split('\n')
        new_lines = []
        for i, line in enumerate(lines):
            if 'uses: actions/setup-node' in line:
                indent = line[:line.find('uses:')]
                # Check previous line to see if it's a step definition start (e.g. "- name: ...")
                # But easiest is just to insert the step directly
                new_lines.append(f'{indent}- uses: pnpm/action-setup@v4')
                new_lines.append(line)
            else:
                new_lines.append(line)

        with open(filepath, 'w') as f:
            f.write('\n'.join(new_lines))
        print(f"Fixed {filepath}")
    else:
        print(f"Skipping {filepath} (pnpm used but no setup-node found)")

for root, dirs, files in os.walk('.github/workflows'):
    for file in files:
        if file.endswith('.yml') or file.endswith('.yaml'):
            fix_workflow(os.path.join(root, file))
