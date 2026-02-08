import sys

filepath = '.github/workflows/ci-verify.yml'
with open(filepath, 'r') as f:
    lines = f.readlines()

output = []
skip = False

for i, line in enumerate(lines):
    if skip:
        if line.strip().startswith('version:'):
            continue
        else:
            skip = False

    if 'with:' in line and len(output) >= 2:
        prev_line = output[-1].strip()
        prev_prev_line = output[-2].strip()
        # The previous block was:
        # with:
        #   version: v0.68.0
        if prev_line.startswith('version: v0.68.0') and prev_prev_line == 'with:':
             skip = True
             continue

    output.append(line)

with open(filepath, 'w') as f:
    f.writelines(output)
