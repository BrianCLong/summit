import re

file_path = '.github/workflows/ci.yml'

with open(file_path, 'r') as f:
    lines = f.readlines()

new_lines = []
in_steps = False
current_job = ""
job_indent = ""

# Define the standard blocks we want to enforce
setup_block = [
    "      - name: Setup pnpm\n",
    "        uses: pnpm/action-setup@v4\n",
    "      - name: Setup Node\n",
    "        uses: actions/setup-node@v4\n",
    "        with:\n",
    "          cache: 'pnpm'\n",
    "          node-version-file: .nvmrc\n"
]

# Config guard needs to be careful, it uses 'pnpm -w check:jest-config'
# We will use the same setup block for consistency as pnpm requires node.

target_jobs = ['lint', 'typecheck', 'unit-tests', 'integration-test', 'soc-controls', 'config-guard']

i = 0
while i < len(lines):
    line = lines[i]

    # Detect job
    if re.match(r'^  [a-zA-Z0-9_-]+:$', line):
        current_job = line.strip()[:-1]

    if current_job in target_jobs:
        # Detect checkout
        if 'uses: actions/checkout@v4' in line:
            new_lines.append(line)
            # Insert our new setup block
            new_lines.extend(setup_block)
            i += 1
            continue

        # Detect and skip OLD setup steps
        # We need to skip:
        # - name: Setup pnpm ... uses: pnpm/action-setup@v4
        # - name: Setup Node ... uses: actions/setup-node@v4 ... with: ... cache: ... node-version-file: ...

        skip = False
        if 'uses: pnpm/action-setup@v4' in line:
            skip = True
            # Check if previous line was name: Setup pnpm (optional)
            if len(new_lines) > 0 and 'name: Setup pnpm' in new_lines[-1]:
                new_lines.pop()

        elif 'uses: actions/setup-node@v4' in line:
            skip = True
            # Check if previous line was name: Setup Node
            if len(new_lines) > 0 and 'name: Setup Node' in new_lines[-1]:
                new_lines.pop()

            # Also skip 'with' block following it
            # Look ahead
            j = i + 1
            while j < len(lines):
                next_line = lines[j]
                stripped = next_line.strip()
                # If next line is 'with:' or indented args, skip
                # We assume args are indented more than the step
                # Step indent is usually 6 or 8 spaces.
                # 'uses' is at 8 spaces usually.
                # 'with' is at 8 or 10.
                if stripped.startswith('with:') or stripped.startswith('cache:') or stripped.startswith('node-version-file:') or stripped.startswith('always-auth:') or stripped.startswith('check-latest:') or stripped.startswith('token:'):
                    j += 1
                else:
                    break
            # Update i to skip these lines
            i = j - 1 # loop will increment i

        if skip:
            i += 1
            continue

    new_lines.append(line)
    i += 1

with open(file_path, 'w') as f:
    f.writelines(new_lines)
