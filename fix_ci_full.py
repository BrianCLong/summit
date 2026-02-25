import re

file_path = '.github/workflows/ci.yml'

with open(file_path, 'r') as f:
    lines = f.readlines()

# We will process line by line and reconstruct
new_lines = []
in_steps = False
job_indent = ""
current_job = ""
skip_setup = False

setup_node_block = """      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          cache: 'pnpm'
          node-version-file: .nvmrc
"""

setup_pnpm_block = """      - name: Setup pnpm
        uses: pnpm/action-setup@v4
"""

for i, line in enumerate(lines):
    # Detect job start (simplified)
    if re.match(r'^  [a-zA-Z0-9_-]+:$', line):
        current_job = line.strip()[:-1]
        in_steps = False
        skip_setup = False

    if line.strip().startswith('steps:'):
        in_steps = True
        new_lines.append(line)
        continue

    if in_steps and current_job in ['lint', 'typecheck', 'unit-tests', 'integration-test', 'soc-controls', 'config-guard']:
        # We want to enforce: checkout -> pnpm -> node
        # We will strip existing setup-node and setup-pnpm lines and inject them cleanly after checkout.

        # Detect checkout
        if 'uses: actions/checkout@v4' in line:
            new_lines.append(line)
            # Inject pnpm and node immediately after checkout
            # Avoid duplicating if we loop
            new_lines.append(setup_pnpm_block)
            if current_job != 'config-guard': # config-guard might not need node cache or uses it differently?
                # Actually config-guard in the original file had setup-pnpm duplicates and no setup-node visible in my grep.
                # But typically we need node. Let's add it.
                # However, config-guard runs 'pnpm -w check:jest-config'. It needs node.
                # It doesn't install deps (no 'pnpm install'), so cache might not be needed or relevant?
                # But 'pnpm' needs node.
                # Let's add Node setup.
                new_lines.append(setup_node_block)
            else:
                 # config-guard usually doesn't install deps, so cache might fail if lockfile absent?
                 # But it runs pnpm. pnpm needs node.
                 # Let's use setup-node but maybe without cache if we want to be safe, or with it.
                 # The prompt failure said "Unable to locate executable file: pnpm".
                 # So pnpm setup is crucial.
                 new_lines.append(setup_node_block)

            skip_setup = True # Flag to skip existing setup lines
            continue

        # If we are skipping existing setup lines
        if skip_setup:
            if 'uses: pnpm/action-setup' in line or 'uses: actions/setup-node' in line or 'name: Setup pnpm' in line or 'name: Setup Node' in line:
                # Skip this line
                continue
            if line.strip() == 'with:' or line.strip().startswith('cache:') or line.strip().startswith('node-version-file:'):
                 # Heuristic to skip args of the skipped actions.
                 # This is risky if other actions use 'with'.
                 # Better: check indentation?
                 # Setup Node/pnpm usually have 6 spaces indent.
                 # 'with' has 8. 'cache' has 10.
                 # We assume these belong to the skipped action.
                 continue

    new_lines.append(line)

# Write back
with open(file_path, 'w') as f:
    f.writelines(new_lines)
