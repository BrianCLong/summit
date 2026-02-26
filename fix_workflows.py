import os
import re

def fix_workflow(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Remove version: ... lines from pnpm/action-setup
    # Match uses: pnpm/action-setup... with a following with: block
    # and remove the version line within it.

    new_content = content
    # Look for pnpm/action-setup followed by version
    # This is a bit tricky with regex if indentation varies.

    # Try to find 'uses: pnpm/action-setup'
    # Then look ahead for 'version: ...' and remove it.
    # Also ensure 'with:' exists if there are other parameters.

    # Simplest approach: just remove any line matching 'version: 9' or 'version: 10' or 'version: "9' under action-setup

    lines = content.splitlines()
    new_lines = []
    skip_next = False
    in_action_setup = False
    has_with = False

    for i, line in enumerate(lines):
        if 'uses: pnpm/action-setup' in line:
            in_action_setup = True
            has_with = False
            new_lines.append(line)
            continue

        if in_action_setup:
            if line.strip().startswith('with:'):
                has_with = True
                new_lines.append(line)
                continue

            if line.strip().startswith('version:'):
                # skip this line
                continue

            if line.strip() == '':
                new_lines.append(line)
                continue

            if line.startswith('      -') or (line.strip() and not line.startswith(' ' * 8)): # Next step or out of step
                in_action_setup = False
            else:
                # Still in action-setup but not with: or version:
                # If it's an input but has_with is False, we need to add it
                if ':' in line and not has_with:
                    # check if it's indented more than action-setup
                    indent = len(line) - len(line.lstrip())
                    if indent > 8:
                        new_lines.append(' ' * (indent - 2) + 'with:')
                        has_with = True
                new_lines.append(line)
                continue

        new_lines.append(line)

    fixed_content = '\n'.join(new_lines)
    if fixed_content != content:
        with open(filepath, 'w') as f:
            f.write(fixed_content)
        return True
    return False

for root, dirs, files in os.walk('.github/workflows'):
    if '.archive' in root: continue
    for file in files:
        if file.endswith('.yml') or file.endswith('.yaml'):
            if fix_workflow(os.path.join(root, file)):
                print(f"Fixed {os.path.join(root, file)}")

fix_workflow('.github/actions/setup-pnpm/action.yml')
