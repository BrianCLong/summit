import sys

filepath = '.github/workflows/ci-verify.yml'
with open(filepath, 'r') as f:
    lines = f.readlines()

output = []
job_context = None

for i, line in enumerate(lines):
    stripped = line.strip()

    # Detect job context
    if line.startswith('  mcp-ux-lint:'):
        job_context = 'mcp-ux-lint'
    elif line.startswith('  ga-evidence-completeness:'):
        job_context = 'ga-evidence-completeness'
    elif line.startswith('  ') and line.rstrip().endswith(':') and not line.startswith('    '):
        if 'mcp-ux-lint' not in line and 'ga-evidence-completeness' not in line:
             job_context = 'other'

    # Fix OPA
    if 'uses: open-policy-agent/setup-opa@' in line:
        indent = line[:line.find('-')]
        output.append(f'{indent}- uses: open-policy-agent/setup-opa@v2\n')
        output.append(f'{indent}  with:\n')
        output.append(f'{indent}    version: v0.68.0\n')
        continue

    # Insert pnpm setup
    if job_context in ['mcp-ux-lint', 'ga-evidence-completeness']:
        if 'uses: actions/setup-node' in line:
            indent = line[:line.find('-')]
            # Check if previous line was already pnpm setup (idempotency)
            if len(output) > 0 and 'pnpm/action-setup' not in output[-1]:
                output.append(f'{indent}- uses: pnpm/action-setup@v4\n')

    output.append(line)

with open(filepath, 'w') as f:
    f.writelines(output)
