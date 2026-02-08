import sys

filepath = '.github/workflows/ci-verify.yml'
with open(filepath, 'r') as f:
    lines = f.readlines()

output = []
skip = False

for i, line in enumerate(lines):
    if 'uses: open- uses: open-policy-agent/setup-opa@v2' in line:
        # Found the corrupted block start
        indent = line[:line.find('uses:')]
        output.append(f'{indent}uses: open-policy-agent/setup-opa@v2\n')
        continue

    if 'uses: open  with:' in line:
        indent = line[:line.find('uses:')]
        output.append(f'{indent}with:\n')
        continue

    if 'uses: open    version: v0.68.0' in line:
        indent = line[:line.find('uses:')]
        output.append(f'{indent}  version: v0.68.0\n')
        continue

    # Remove the redundant "with:" block if it follows immediately and we just added one?
    # Actually, the corruption added "uses: open" prefix to my inserted lines.
    # But the original lines might still be there or messed up.

    output.append(line)

with open(filepath, 'w') as f:
    f.writelines(output)
