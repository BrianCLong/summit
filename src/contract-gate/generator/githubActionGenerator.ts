export function buildGithubAction(): string {
  return `name: Contract Gate

on:
  pull_request:
    paths:
      - 'contracts/**'
      - 'schemas/**'
      - 'src/contract-gate/**'
      - '.github/workflows/contract-gate.yml'

jobs:
  contract-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - run: pnpm install --frozen-lockfile
      - name: Run contract gate
        run: pnpm ts-node src/contract-gate/cli.ts diff --base contracts/baseline.json --target contracts/proposed.json --report reports/contract-gate.html
`;
}
