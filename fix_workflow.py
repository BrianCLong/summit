import sys

with open('.github/workflows/supply-chain-integrity.yml', 'r') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    # Fix setup-node cache
    if 'cache: "pnpm"' in line:
        new_lines.append(line.replace('cache: "pnpm"', 'cache: false'))
    else:
        new_lines.append(line)
        # Fix setup-go cache
        if 'uses: actions/setup-go' in line:
            # We need to insert cache: false into the 'with' block
            # The next line is usually 'with:'
            pass

# Reread to handle setup-go insertion cleanly
final_lines = []
skip = False
for i, line in enumerate(new_lines):
    final_lines.append(line)
    if 'uses: actions/setup-go' in line:
        # Check if next lines contain 'with:'
        if i+1 < len(new_lines) and 'with:' in new_lines[i+1]:
            # Insert cache: false after with:
            continue

# Actually, let's just use string replacement for the node part, and careful insertion for go
content = "".join(lines)
content = content.replace('cache: "pnpm"', 'cache: false')

if "uses: actions/setup-go" in content:
    # Find the block and inject cache: false
    import re
    # Look for setup-go block and its with:
    pattern = r'(uses: actions/setup-go[^\n]*\n\s+with:\n)'
    replacement = r'\1          cache: false\n'
    content = re.sub(pattern, replacement, content)

with open('.github/workflows/supply-chain-integrity.yml', 'w') as f:
    f.write(content)
