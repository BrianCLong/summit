import os

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()

    if 'actions/setup-node' not in content:
        return

    # If setup-node is present but pnpm-setup is missing or after setup-node
    if 'cache: pnpm' in content or 'cache: "pnpm"' in content or "cache: 'pnpm'" in content:
        if 'pnpm/action-setup' not in content:
            # Insert pnpm setup before setup-node
            lines = content.split('\n')
            new_lines = []
            for line in lines:
                if 'uses: actions/setup-node' in line:
                    indent = line[:line.find('-')]
                    new_lines.append(f"{indent}- name: Setup pnpm")
                    new_lines.append(f"{indent}  uses: pnpm/action-setup@v4")
                    new_lines.append(f"{indent}  with:")
                    new_lines.append(f"{indent}    version: 10")
                new_lines.append(line)
            content = '\n'.join(new_lines)
        else:
            # Check order
            node_idx = content.find('actions/setup-node')
            pnpm_idx = content.find('pnpm/action-setup')
            if node_idx < pnpm_idx:
                # This is more complex to swap via simple string ops without risk of corruption
                # but I'll try to find the whole steps block
                pass

    # Ensure version 10
    if 'uses: pnpm/action-setup@v4' in content and 'version: 10' not in content:
        if 'with:' in content[content.find('pnpm/action-setup'):content.find('pnpm/action-setup')+100]:
             # Has with: block, add version
             pass
        else:
             content = content.replace('uses: pnpm/action-setup@v4', 'uses: pnpm/action-setup@v4\n        with:\n          version: 10')

    with open(path, 'w') as f:
        f.write(content)

workflows = [
    ".github/workflows/_reusable-test-suite.yml",
    ".github/workflows/ci-intelgraph-server.yml",
    ".github/workflows/dependency-freeze-check.yml",
    ".github/workflows/deploy-aws.yml",
    ".github/workflows/deploy-preview.yml",
    ".github/workflows/docker-build.yml",
    ".github/workflows/memalign-ci.yml",
    ".github/workflows/sbom-scan.yml",
    ".github/workflows/supply-chain-delta.yml",
    ".github/workflows/supplychain-drift.yml",
    ".github/workflows/supplychain-gates.yml",
    ".github/workflows/test-runners.yml",
    ".github/workflows/workflow-lint.yml"
]

for w in workflows:
    if os.path.exists(w):
        fix_file(w)
        print(f"Processed {w}")
