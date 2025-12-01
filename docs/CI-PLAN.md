# CI Simplification Plan

## Goals
- Provide a clear, fast PR lane that runs lint, type checks, and unit-level tests on every push and pull request.
- Protect `main` with a golden-path workflow that mirrors `make bootstrap && make up && make smoke` and captures logs on failure.
- Consolidate security checks into an explicit lane and clarify which workflows are required for branch protection.
- Establish a safe merge-train/automerge approach for healthy PRs without rewriting history.

## Current Signals (Recon)
- Multiple CI workflows exist for targeted checks (linting, validation, performance, release gates) alongside automation helpers (auto-merge, queue management, stale handling).
- Golden-path commands are documented in the Makefile (`bootstrap`, `up`, `smoke`) with health/wait scripts under `scripts/`.
- `pnpm@9` is the declared package manager; Node 18+ is required. Make targets expect Docker and compose availability.

## Target Model
### Fast Lane (PR protection)
- Workflow: `.github/workflows/ci-lint-and-unit.yml`
- Triggers: `pull_request` to `main`, `push` to `main`.
- Tooling: Node 20 LTS + pnpm 9 with cached installs.
- Steps: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test:quick`.

### Golden Path / Integration Lane
- Workflow: `.github/workflows/ci-golden-path.yml`
- Triggers: `push` to `main`, nightly schedule, manual dispatch.
- Steps: dependency install, `make bootstrap`, `make up`, `make smoke`, always `make down` for cleanup.
- Failure artifacts: compose logs and `docker ps` snapshot.

### Security Lane
- Keep existing security scanning workflows but converge required checks to a single gate (e.g., `security.yml`).
- Run on `push` to `main` and scheduled cadence; avoid PR blocking unless labelled `security-critical`.

## Merge-Train and Auto-Update Strategy
- Label `automerge-safe` for PRs that are conflict-free, green on required checks, and lack blocking labels.
- Use existing auto-update automation (e.g., `auto-update-prs.yml`) to rebase/merge `main` into labelled branches when stale.
- Queue-based merges: process `merge-train` labelled PRs sequentially—update from `main`, wait for `ci-lint-and-unit`, then optional `ci-golden-path` if stack files change. Stop the train on the first failure for manual intervention.
- Never force-push `main`; only use `--force-with-lease` on contributor branches when explicitly coordinating.

## Branch Protection Recommendations
- Require checks: `CI - Lint and Unit / lint, typecheck, and unit tests`; `CI - Golden Path / golden path integration`; plus chosen security gate (e.g., `security / security-scan`).
- Optional informational checks: doc linting, coverage deltas, performance probes.

## Follow-Ups
- Deprecate redundant workflows by converting them to dispatch-only stubs that reference the new lanes.
- Align labels (`automerge-safe`, `merge-train`, `security-critical`) and document expectations in contributor guides.
- Add dashboards for CI health and merge-train queue stats.
