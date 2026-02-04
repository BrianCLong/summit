# Repo Assumptions (Subsumption Bundle Scaffold)

## Verified

- Repo state: Intentionally constrained to local verification; external branch protection state is deferred pending governance access.

## Assumed (must validate)

- CI uses GitHub Actions.
- Node runtime is available for CI scripts.
- Evidence artifacts are acceptable as JSON outputs under `evidence/`.

## Must-not-touch

- Existing workflows (modify only by adding new workflow or a single job if conventions require).
- Public API surfaces and packages unless explicitly required by a gate.

## Validation plan

- Discover required checks (see `docs/required_checks.todo.md`).
- Confirm Node version and package manager conventions.
