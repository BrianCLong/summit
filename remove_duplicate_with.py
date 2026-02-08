import sys

filepath = '.github/workflows/ci-verify.yml'
with open(filepath, 'r') as f:
    lines = f.readlines()

output = []
skip_count = 0

for i, line in enumerate(lines):
    if skip_count > 0:
        skip_count -= 1
        continue

    # Identify the specific block
    if 'uses: open-policy-agent/setup-opa@v2' in line:
        output.append(line)
        # Check next lines for duplicate with
        if i + 3 < len(lines):
            l1 = lines[i+1].strip()
            l2 = lines[i+2].strip()
            l3 = lines[i+3].strip()
            if l1 == 'with:' and l2 == 'version: v0.68.0' and l3 == 'with:':
                 # We have a duplicate starting at i+3
                 # append the first with block
                 output.append(lines[i+1])
                 output.append(lines[i+2])
                 # skip the second with block (2 lines)
                 skip_count = 2
        continue

    output.append(line)

with open(filepath, 'w') as f:
    f.writelines(output)
