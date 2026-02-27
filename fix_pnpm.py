import os
import re

def fix_workflow(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Identify and remove version: ... line under uses: pnpm/action-setup
    lines = content.splitlines()
    new_lines = []
    in_action_setup = False

    for i, line in enumerate(lines):
        if 'uses: pnpm/action-setup' in line:
            in_action_setup = True
            new_lines.append(line)
            continue

        if in_action_setup:
            if 'version:' in line:
                continue
            if 'with:' in line and i + 1 < len(lines) and 'version:' in lines[i+1].strip() and (i + 2 >= len(lines) or not lines[i+2].strip() or lines[i+2].startswith(' ' * 10) == False):
                # Check if with: only has version: and nothing else following at same/more indent
                # This is heuristic.
                pass

            # Reset if we hit a new step or something at same indent as uses
            if line.strip().startswith('-') or (line.strip() and not line.startswith(' ' * 8)):
                in_action_setup = False

        new_lines.append(line)

    # Clean up empty with: blocks
    final_content = '\n'.join(new_lines)
    final_content = re.sub(r'with:\s*\n\s*\n', '\n', final_content)
    final_content = re.sub(r'with:\s*$', '', final_content, flags=re.MULTILINE)

    if final_content != content:
        with open(filepath, 'w') as f:
            f.write(final_content)
        return True
    return False

# Also fix the default values in reusable workflows
def fix_defaults(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    new_content = content.replace('default: "9.12.0"', 'default: "10.0.0"')
    new_content = new_content.replace('pnpm=9.12.0', 'pnpm=10.0.0')
    new_content = new_content.replace('pnpm 9.12.0', 'pnpm 10.0.0')
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        return True
    return False

for root, _, files in os.walk('.github'):
    if '.archive' in root: continue
    for file in files:
        if file.endswith(('.yml', '.yaml')):
            path = os.path.join(root, file)
            if fix_workflow(path):
                print(f"Fixed pnpm version in {path}")
            if fix_defaults(path):
                print(f"Fixed pnpm defaults in {path}")
