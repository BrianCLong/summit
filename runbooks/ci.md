# CI Runbook

## Overview
- `ci-lint-and-unit.yml` runs on every PR/main push, reusing the pnpm cache and turbo metadata, and executes lint/typecheck/test for the entire workspace.
- `ci-golden-path.yml` defends the golden path by running `make bootstrap`, `make up`, and `make smoke`, publishing the `summit-validation-20.x` artifacts that feed the release automation.
- `security.yml` adds CodeQL (JS/Python), dependency-review, and gitleaks scans on PRs plus a nightly cadence.
- `release.yml` packages the deployable artifact after the required statuses pass on `main` or matching file changes.

## Required Statuses (branch protection)
1. `CI (Lint & Unit)` — ensures TypeScript, linting, and unit/integration suites complete inside the pnpm workspace.
2. `CI Golden Path` — stretches the stack end-to-end using the seeded dataset (`data/golden-path/demo-investigation.json`).
3. `Security` — CodeQL + gitleaks to guard supply-chain and secret hygiene.

## Reproducing CI locally
1. `corepack enable && pnpm install --frozen-lockfile`
2. `make bootstrap` to install deps and generate `.env`
3. `make up` (or `./start.sh`) to start the stack and wait for health probes
4. `make smoke` (or `pnpm smoke`) to run the golden-path harness that mirrors the CI job
5. `make down` to clean up containers or rely on `./scripts/run-compose.sh -f docker-compose.dev.yml down -v`

**Tip:** `./start.sh [--ai]` wraps bootstrap/up/smoke so developers can mirror CI with one command.

## Debugging common CI failures
- **Lint/typecheck/tests:** re-run `pnpm -w run lint`, `pnpm -w run typecheck`, and `pnpm -w run test` locally. Turbo logs live in `.turbo/logs`.
- **Golden path:** inspect `artifacts/golden-path.log` (uploaded to Actions) and rerun `make smoke` locally with `set -x` to trace failing steps.
- **Docker Compose issues:** `./scripts/run-compose.sh -f docker-compose.dev.yml logs --tail=200` surfaces container logs; check `./scripts/wait-for-stack.sh` output for readiness problems.
- **Release automation:** `auto-draft-release.yml` selects the `summit-validation-20.x` artifact from `ci-golden-path`. Ensure the artifact exists when re-running the workflow.
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
