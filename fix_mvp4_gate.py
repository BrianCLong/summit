import re

file_path = '.github/workflows/mvp4-gate.yml'

with open(file_path, 'r') as f:
    lines = f.readlines()

new_lines = []
in_steps = False
current_job = ""
job_indent = ""

setup_block = [
    "      - name: Setup pnpm\n",
    "        uses: pnpm/action-setup@v4\n",
    "      - name: Setup Node\n",
    "        uses: actions/setup-node@v4\n",
    "        with:\n",
    "          cache: 'pnpm'\n",
    "          node-version-file: .nvmrc\n"
]

# Jobs to fix in mvp4-gate.yml: likely all of them or specific ones.
# Based on logs, 'Quarantine Tests (Flaky)' and 'Security Gate (Gitleaks + Snyk)' failed.
# I'll apply to all jobs that use checkout and setup-node.

i = 0
while i < len(lines):
    line = lines[i]

    # Detect job indent
    if re.match(r'^  [a-zA-Z0-9_-]+:$', line):
        current_job = line.strip()[:-1]

    # We look for steps using checkout
    if 'uses: actions/checkout@v4' in line:
        new_lines.append(line)
        # Add setup block
        new_lines.extend(setup_block)
        i += 1
        continue

    # Skip existing setup-node and setup-pnpm
    skip = False
    if 'uses: pnpm/action-setup@v4' in line:
        skip = True
        if len(new_lines) > 0 and 'name: Setup pnpm' in new_lines[-1]:
            new_lines.pop()

    elif 'uses: actions/setup-node@v4' in line:
        skip = True
        if len(new_lines) > 0 and 'name: Setup Node' in new_lines[-1]:
            new_lines.pop()

        # Skip args
        j = i + 1
        while j < len(lines):
            next_line = lines[j]
            stripped = next_line.strip()
            if stripped.startswith('with:') or stripped.startswith('cache:') or stripped.startswith('node-version-file:') or stripped.startswith('always-auth:') or stripped.startswith('check-latest:') or stripped.startswith('token:'):
                j += 1
            else:
                break
        i = j - 1

    if skip:
        i += 1
        continue

    new_lines.append(line)
    i += 1

with open(file_path, 'w') as f:
    f.writelines(new_lines)
