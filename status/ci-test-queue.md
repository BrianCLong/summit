# Project #19 — CI/Test Determinism Queue

This document tracks the next CI/test stabilization items aligned to Project #19 and records the Spec Card and evidence for the current item in flight.

## Queue (top 5, ordered by severity)

1. **Pin pnpm runtime in CI to repository baseline** — Project: https://github.com/users/BrianCLong/projects/19 (Item: CI runtime parity). _Root-cause hypothesis:_ pnpm/action-setup defaults to the latest release, drifting away from the repo's declared `pnpm@10.0.0` and creating inconsistent lockfile resolution between reruns.
2. **Restore blocking unit-test gate with deterministic ESM/Jest setup** — Project: https://github.com/users/BrianCLong/projects/19 (Item: Core unit tests). _Root-cause hypothesis:_ legacy `continue-on-error` plus unresolved ESM path resolution makes the suite flaky and non-blocking.
3. **Close open-handle leaks in Jest global setup/teardown** — Project: https://github.com/users/BrianCLong/projects/19 (Item: Test hygiene). _Root-cause hypothesis:_ Redis/Neo4j/Testcontainers clients stay open after suites, intermittently hanging CI.
4. **Stabilize golden-path smoke (make up/down) for deterministic teardown** — Project: https://github.com/users/BrianCLong/projects/19 (Item: Golden path). _Root-cause hypothesis:_ Docker compose teardown races leave residual containers, causing sporadic port conflicts on retries.
5. **Make schema-diff/provenance checks blocking with cached GraphQL artifacts** — Project: https://github.com/users/BrianCLong/projects/19 (Item: Governance & schema). _Root-cause hypothesis:_ current non-blocking status masks drift; lack of cached schema snapshots inflates runtime and risk of flake.

## ARTIFACT A — CI/Test Spec Card (Item #1)

- **Project Item:** https://github.com/users/BrianCLong/projects/19 (CI runtime parity stream)
- **Linked Issue(s):** internal tracker entry: "Standardize pnpm runner to 10.0.0 for CI determinism"
- **Problem statement:** CI jobs install whatever pnpm version the action publishes, diverging from the repo's `packageManager` and causing inconsistent installs/test runs across reruns and machines.
- **Acceptance criteria:**
  - [ ] Deterministic across 3 consecutive CI runs
  - [x] Local reproduction steps documented
  - [x] Canonical command(s) defined (single source of truth)
  - [x] Root cause eliminated (not masked)
- **Verification plan:**
  - Local commands:
    - `pnpm --version`
    - `pnpm test:quick` (repeat x3 for deterministic smoke)
  - CI evidence:
    - `.github/workflows/ci.yml` → pnpm version pinned to 10.0.0 across jobs
  - Flake proof:
    - Run quick smoke three times locally (documented below); rerun CI workflow 3x post-merge

## ARTIFACT B — Change Summary (Item #1)

- Files changed: `.github/workflows/ci.yml`, `status/ci-test-queue.md`, `docs/roadmap/STATUS.json`
- Root cause analysis: pnpm/action-setup pulled the latest pnpm, which could differ from the repo-declared version, producing lockfile/install drift and inconsistent test behavior across reruns and contributors.
- Fix strategy: Pin pnpm to 10.0.0 (the repository baseline) in every CI job and standardize checkout versions for deterministic runner behavior; document the queue/spec card and update roadmap status to reflect CI runtime unification.
- Risk/rollback:
  - Low risk: pinned pnpm matches declared packageManager; rollback by removing the explicit version if upstream policies change.
  - If CI runners lack pnpm 10.0.0 cache, the action will install it—acceptable overhead.

## ARTIFACT C — Evidence Log (Item #1)

- Local:
  - `pnpm test:quick` (3x) → PASS (sanity smoke, deterministic output)
- CI:
  - Pending PR run; expect `.github/workflows/ci.yml` to show pinned pnpm=10.0.0 on all jobs.
- Repeatability:
  - Local quick smoke repeated 3/3 passes (see command output in PR discussion)

## ARTIFACT D — Project Update Note (paste-ready)

Title: Stabilized CI/Test Infra — pnpm runtime pinned (Project #19)

- PR: Link to this PR once opened
- What changed:
  - Pinned pnpm to 10.0.0 across CI jobs to match repository packageManager
  - Documented the CI/test stabilization queue and spec card for Item #1
  - Updated roadmap status to reflect CI runtime alignment work
- Verification:
  - Local: `pnpm test:quick` (3x) for deterministic smoke
  - CI: `.github/workflows/ci.yml` uses pinned pnpm version; CI run should show pnpm@10.0.0 in logs
- Determinism evidence:
  - Local smoke repeated 3/3 passes; plan to rerun CI workflow 3x post-merge
- Notes / follow-ups:
  - Next item: make unit-test job blocking with deterministic ESM/Jest setup (see reproduction plan below)

## Next-up: Item #2 Reproduction Plan (unit test gate)

- **Target:** Restore blocking unit-test gate with deterministic ESM/Jest setup.
- **Repro steps:**
  - Run `pnpm test:unit --filter intelgraph-server --runInBand --detectOpenHandles` locally to surface ESM/resolution/open-handle issues.
  - Capture failing test files and stack traces; note any missing moduleNameMapper/path aliases.
  - Validate teardown by checking for lingering Redis/Neo4j/Testcontainer handles using `--runInBand --detectOpenHandles` and post-test logs.
- **Exit criteria for repro:** Consolidated failure log, identified root cause category (ESM resolver vs open handles vs environment), and candidate fix design documented in follow-up ticket.
