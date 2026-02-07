import os

def fix_workflow(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    changed = False
    lines = content.split('\n')
    new_lines = []

    # We want to ensure pnpm/action-setup is present if pnpm is used.
    # A simple heuristic: if 'cache: pnpm' is found in a job, scanning backwards,
    # we should see 'pnpm/action-setup'. If not, insert it before 'actions/setup-node'.

    # Actually, simpler: just find 'uses: actions/setup-node' blocks.
    # If they have 'cache: pnpm', ensure the preceding steps include 'pnpm/action-setup'.
    # This is hard to parse line-by-line without a yaml parser.

    # Let's use a simpler replacement strategy.
    # Find "- uses: actions/setup-node@v4"
    # Check if the file contains "pnpm/action-setup". If NOT, replace setup-node with pnpm-setup + setup-node.

    if 'actions/setup-node' in content and 'pnpm/action-setup' not in content:
        # We need to be careful about indentation.
        for line in lines:
            if 'uses: actions/setup-node' in line:
                indent = line.split('-')[0]
                new_lines.append(f'{indent}- uses: pnpm/action-setup@v4')
                new_lines.append(line)
                changed = True
            else:
                new_lines.append(line)
    else:
        new_lines = lines

    if changed:
        with open(filepath, 'w') as f:
            f.write('\n'.join(new_lines))
        print(f"Fixed {filepath}")

for root, dirs, files in os.walk('.github/workflows'):
    for file in files:
        if file.endswith('.yml') or file.endswith('.yaml'):
            fix_workflow(os.path.join(root, file))
