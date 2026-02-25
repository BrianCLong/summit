import yaml

with open('.github/workflows/mvp4-gate.yml', 'r') as f:
    data = yaml.safe_load(f)

# Fix build-lint-strict
steps = data['jobs']['build-lint-strict']['steps']
# Ensure checkout -> pnpm -> node
new_steps = [
    {'uses': 'actions/checkout@v4'},
    {'uses': 'pnpm/action-setup@v4'},
    {'name': 'Setup Node', 'uses': 'actions/setup-node@v4', 'with': {'node-version': '20', 'cache': 'pnpm'}},
    {'name': 'Install', 'run': 'pnpm install --frozen-lockfile'},
    {'name': 'Strict Lint', 'run': 'pnpm lint:strict'},
    {'name': 'Typecheck', 'run': 'pnpm typecheck'}
]
data['jobs']['build-lint-strict']['steps'] = new_steps

# Fix quarantine-tests
steps = data['jobs']['quarantine-tests']['steps']
new_steps = [
    {'uses': 'actions/checkout@v4'},
    {'uses': 'pnpm/action-setup@v4'},
    {'name': 'Setup Node', 'uses': 'actions/setup-node@v4', 'with': {'node-version': '20', 'cache': 'pnpm'}},
    {'name': 'Install', 'run': 'pnpm install --frozen-lockfile'},
    {'name': 'Run Flaky Tests', 'run': 'pnpm test:quarantine'}
]
data['jobs']['quarantine-tests']['steps'] = new_steps

# Fix security-gate
steps = data['jobs']['security-gate']['steps']
# Keep Gitleaks and Dependency Check, fix setup
new_steps = [
    {'uses': 'actions/checkout@v4', 'with': {'fetch-depth': 0}},
    {'uses': 'pnpm/action-setup@v4'},
    {'name': 'Setup Node', 'uses': 'actions/setup-node@v4', 'with': {'node-version': '20', 'cache': 'pnpm'}},
    {'name': 'Gitleaks', 'uses': 'gitleaks/gitleaks-action@ff98106e4c7b2bc287b24eaf42907196329070c7', 'env': {'GITHUB_TOKEN': '${{ secrets.GITHUB_TOKEN }}'}},
    {'name': 'Dependency Check', 'run': 'echo "Scanning for Critical CVEs..."\npnpm audit --audit-level critical\n'}
]
data['jobs']['security-gate']['steps'] = new_steps

with open('.github/workflows/mvp4-gate.yml', 'w') as f:
    yaml.dump(data, f, sort_keys=False, default_flow_style=False, allow_unicode=True)
