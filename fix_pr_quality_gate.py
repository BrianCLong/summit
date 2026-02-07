import yaml

with open('.github/workflows/pr-quality-gate.yml', 'r') as f:
    content = f.read()

# Fix step ordering manually as YAML parsing drops comments
# We want pnpm/action-setup BEFORE actions/setup-node

# This string replacement strategy is brittle but effective for this specific file content
pnpm_setup = '''      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9'''

node_setup = '''      - name: Setup Node.js
        uses: actions/setup-node@v4 # v6
        with:
          node-version: 20
          cache: "pnpm"'''

# Swap in validate-release-policy
content = content.replace(node_setup + '\n\n' + pnpm_setup, pnpm_setup + '\n\n' + node_setup)

# Swap in lint-reason-codes
# Doing it twice because replace does all occurrences
# Verify if it worked

# Fix SBOM generation args and path
old_sbom_cmd = 'run: bash scripts/generate-sbom.sh . artifacts/sbom/sbom.json'
new_sbom_cmd = 'run: bash scripts/generate-sbom.sh summit-platform ci-build artifacts/sbom'
content = content.replace(old_sbom_cmd, new_sbom_cmd)

old_env_sbom = 'SBOM_FILE: artifacts/sbom/sbom.json'
new_env_sbom = 'SBOM_FILE: artifacts/sbom/summit-platform-main-ci-build.cdx.json'
content = content.replace(old_env_sbom, new_env_sbom)

old_path_sbom = 'path: artifacts/sbom/sbom.json'
new_path_sbom = 'path: artifacts/sbom/'
content = content.replace(old_path_sbom, new_path_sbom)

with open('.github/workflows/pr-quality-gate.yml', 'w') as f:
    f.write(content)
