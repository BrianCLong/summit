# CI Operations Guide

## Quick Start

Run the parity script to verify your changes before pushing:

```bash
./scripts/ci/ci-parity.sh
```

## Workflows

The repository uses GitHub Actions for CI. Key workflows:

*   `.github/workflows/_reusable-test.yml`: The core logic for running tests.
*   `.github/workflows/ci.yml`: The main entry point.

## Troubleshooting

### "sh: 1: tsc: not found"
This usually means dependencies are not linked correctly. Run:
```bash
pnpm install
```
If that persists, ensure `typescript` is in your package's `devDependencies` or the root.

### "ERR_MODULE_NOT_FOUND"
Ensure you are using `pnpm` and not `npm`. The dependency strictness of pnpm requires all dependencies to be declared.
