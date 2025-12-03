# CI/CD Runbook

## Overview

This project uses a "Deployable-First" CI strategy. The `main` branch must always be deployable.

## Workflows

### 1. `ci-lint-and-unit.yml` (Fast Lane)
*   **Runs on**: Every PR and push to `main`.
*   **What it does**: Installs dependencies, lints, typechecks, and runs unit tests.
*   **Troubleshooting**:
    *   **Lint errors**: Run `pnpm lint:fix` locally.
    *   **Type errors**: Run `pnpm typecheck` locally.
    *   **Test failures**: Run `pnpm test` locally.

### 2. `ci-golden-path.yml` (Integration Lane)
*   **Runs on**: Every PR and push to `main`.
*   **What it does**: Boots the full stack (`make up`) and runs smoke tests (`make smoke`).
*   **Troubleshooting**:
    *   Check the "Upload Artifacts" in GitHub Actions to see logs.
    *   Run `./start.sh` locally to reproduce.

### 3. `security.yml` (Security Lane)
*   **Runs on**: Nightly and `main`.
*   **What it does**: Scans for secrets (Gitleaks) and vulnerabilities (CodeQL).

## Merge Train

To merge a PR:
1.  Ensure all checks pass.
2.  Get approvals.
3.  Add the `automerge-safe` label (if you are a maintainer).
4.  The merge train automation will pick it up, update it, and merge it when green.

### Manual Merge Train (Emergency)
If the bot is stuck, run:
```bash
./scripts/merge-train.sh
```
(Requires `gh` CLI installed and authenticated).