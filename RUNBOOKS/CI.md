# CI Runbook

This runbook documents the streamlined CI lanes and operational expectations for Summit.

## Lanes
- **CI - Lint and Unit** (`.github/workflows/ci-lint-and-unit.yml`)
  - Trigger: `pull_request` to `main`, `push` to `main`.
  - Steps: pnpm install (cached), `pnpm lint`, `pnpm typecheck`, `pnpm test:quick`.
  - Purpose: fast feedback for branch protection.
- **CI - Golden Path** (`.github/workflows/ci-golden-path.yml`)
  - Trigger: `push` to `main`, nightly schedule, manual dispatch.
  - Steps: pnpm install, `make bootstrap`, `make up`, `make smoke`, always `make down`; collect compose logs on failure.
  - Purpose: enforce the deployable-first workflow on `main` and nightly drift detection.
- **Security Gate** (`security.yml` or equivalent)
  - Trigger: `push` to `main`, scheduled cadence.
  - Scope: SCA/secret scanning; avoid blocking PRs unless labelled `security-critical`.

## Required Checks for Branch Protection
- `CI - Lint and Unit / lint, typecheck, and unit tests`
- `CI - Golden Path / golden path integration`
- `security / security-scan` (or the chosen consolidated security job)

## Merge Train & Auto-Update
1. Label PRs `automerge-safe` when they are conflict-free, green on required checks, and free of blocking labels (WIP, do-not-merge).
2. Use the existing auto-update workflow (`auto-update-prs.yml`) to rebase/merge `main` into stale PR branches.
3. For `merge-train` labelled PRs:
   - Update branch from `main`.
   - Wait for `CI - Lint and Unit` to pass; run `CI - Golden Path` when stack/deployment files change.
   - Auto-merge when green; stop the train at the first failure and request fixes.

## Debugging Playbook
- **Fast lane failures**
  - Re-run locally: `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test:quick`.
  - Clear turborepo cache if needed: `rm -rf .turbo`.
- **Golden path failures**
  - Download `golden-path-logs` artifact for compose output and `docker ps` snapshot.
  - Re-run locally: `make bootstrap && make up && make smoke`; inspect health endpoints via `scripts/wait-for-stack.sh` guidance.
  - Clean stack: `make down && docker system prune -f` if residue is suspected.
- **Security failures**
  - Address reported vulnerabilities; rerun the relevant security script (`pnpm run security:scan` or workflow-specific command).

## Onboarding Expectations
- New contributors should run `make bootstrap && make up && make smoke` (or `./start.sh` if available) before pushing.
- PRs should target `main` and keep scope narrow; enable `automerge-safe` only when CI is green.

## Operational Notes
- Do not force-push `main`.
- Prefer `--force-with-lease` on contributor branches only when coordinating conflict resolution.
- Keep workflow job names stable to preserve branch protection settings.
