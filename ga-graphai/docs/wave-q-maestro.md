# Wave Q Maestro Conductor Playbook

## Assignments and Allowlists

- **Q1 — Repo Doctor v0.1 (local)**: `scripts/dev/repo-doctor.ts`, `test/repo-doctor/**`, `docs/dev/REPO_DOCTOR.md`.
- **Q2 — Preflight Check (CI+local)**: `scripts/dev/preflight.ts`, `test/preflight/**`, `.github/workflows/preflight.yml`, `docs/dev/PREFLIGHT.md`.
- **Q3 — Fixture Factory (shared test utilities)**: `test/fixtures/factory.ts`, `test/fixtures/**`, `docs/dev/TEST_FIXTURES.md`.
- **Q4 — GA Verify Wrapper Script (one command)**: `scripts/ga/verify.ts`, `test/ga-verify/**`, `docs/release/GA_VERIFY.md`.
- **Q5 — Makefile/Task Runner Glue (optional)**: `Makefile` (append only), `docs/dev/DEV_COMMANDS.md`, `test/dev-commands/**`.
- **Q6 — “Fast Unit” Test Profile (wrapper)**: `scripts/dev/test-fast.ts`, `docs/dev/TEST_PROFILES.md`, `test/test-fast/**`.
- **Q7 — Troubleshooting Matrix (docs-only)**: `docs/dev/TROUBLESHOOTING.md`.
- **Q8 — Onboarding Quickstart Update (docs-only)**: `docs/dev/QUICKSTART.md`.
- **Q-DI — Docs Indexer Wave Q**: `README.md` (docs links section only), `docs/index.md` or `docs/README.md` (links only).

## Merge Choreography

- Merge **Q2 (preflight)** and **Q1 (doctor)** first.
- **Q3** ideally lands before **Q6** if it feeds fixtures.
- **Q4** is independent.
- **Q5** should follow Q1/Q4 where targets call new scripts.
- **Q7** and **Q8** can merge anytime.
- **Q-DI** merges last to update shared doc indexes.

## Copy/Paste Codex Prompts

### Q1 — Repo Doctor v0.1 (local)

```
Q1 — Codex Prompt: Repo Doctor v0.1 (local)

Objective:
ONE atomic PR adding a repo-doctor script that diagnoses common setup issues and prints actionable fixes.

ALLOWLIST:
- scripts/dev/repo-doctor.ts
- test/repo-doctor/**
- docs/dev/REPO_DOCTOR.md

Doctor checks (fast, deterministic):
- node version matches repo expectation
- pnpm installed + version
- required env vars presence (names only)
- git hooks/tooling presence (if any)
- ports in use (optional, best-effort)
Output:
- status per check + suggested command to fix

Tests:
- use injected “system info” fixtures; do NOT depend on actual machine state

Acceptance:
- [ ] deterministic
- [ ] CI green
```

### Q2 — Preflight Check (CI+local) [fast]

```
Q2 — Codex Prompt: Preflight Check (CI+local) [fast]

Objective:
ONE atomic PR adding a fast preflight script and CI workflow that ensures minimal sanity before expensive jobs.

ALLOWLIST:
- scripts/dev/preflight.ts
- test/preflight/**
- .github/workflows/preflight.yml
- docs/dev/PREFLIGHT.md

Preflight checks (<10s):
- TypeScript config parse / package graph sanity
- lockfile presence
- schema validation scripts existence (if expected)
- “no dirty generated files” check (optional)
Workflow:
- runs on PR, uploads preflight report artifact
- should fail only on hard blockers (missing lockfile, syntax errors)

Acceptance:
- [ ] deterministic
- [ ] CI green
```

### Q3 — Fixture Factory (test utilities)

```
Q3 — Codex Prompt: Fixture Factory (test utilities)

Objective:
ONE atomic PR adding a fixture factory that generates consistent test objects (tenant/user/receipt/policyDecision) to reduce boilerplate.

ALLOWLIST:
- test/fixtures/factory.ts
- test/fixtures/**
- docs/dev/TEST_FIXTURES.md

Deliverables:
- factory methods with overrides
- deterministic IDs via seeded generator
- example usage snippet in docs (no mass refactors)

Acceptance:
- [ ] deterministic
- [ ] CI green
```

### Q4 — GA Verify Wrapper Script (one command)

```
Q4 — Codex Prompt: GA Verify Wrapper Script (one command)

Objective:
ONE atomic PR adding a script that runs the GA-critical gates in the correct order and produces a single summary report.

ALLOWLIST:
- scripts/ga/verify.ts
- test/ga-verify/**
- docs/release/GA_VERIFY.md

Behavior:
- runs: schema drift → evidence verifier → repo doctor → unit tests (fast) → build
- supports --profile=fast|full
- outputs ga-verify-report.json + markdown summary
- deterministic in tests (mock child_process)

Acceptance:
- [ ] deterministic tests
- [ ] CI green
```

### Q5 — Makefile / Task Runner Glue (optional)

```
Q5 — Codex Prompt: Makefile / Task Runner Glue (optional)

Objective:
ONE atomic PR adding new Makefile targets that call existing scripts: preflight, doctor, ga-verify.

ALLOWLIST:
- Makefile (append only)
- docs/dev/DEV_COMMANDS.md

Targets:
- make preflight
- make doctor
- make ga-verify
Document commands in DEV_COMMANDS.md.

Acceptance:
- [ ] CI green
```

### Q6 — “Fast Unit” Test Profile Wrapper

```
Q6 — Codex Prompt: “Fast Unit” Test Profile Wrapper

Objective:
ONE atomic PR adding a wrapper script that runs a fast subset of unit tests (by pattern) without changing underlying test config.

ALLOWLIST:
- scripts/dev/test-fast.ts
- docs/dev/TEST_PROFILES.md
- test/test-fast/**

Behavior:
- runs unit tests excluding integration/e2e by path patterns
- prints selection summary
- deterministic tests via mocking

Acceptance:
- [ ] CI green
```

### Q7 — Troubleshooting Matrix (docs-only)

```
Q7 — Codex Prompt: Troubleshooting Matrix (docs-only)

Objective:
ONE atomic PR adding a troubleshooting guide for common failures: ESM mocking, DB connection in tests, pnpm issues, port conflicts.

ALLOWLIST:
- docs/dev/TROUBLESHOOTING.md

Acceptance:
- [ ] only this file changed
```

### Q8 — Onboarding Quickstart (docs-only)

```
Q8 — Codex Prompt: Onboarding Quickstart (docs-only)

Objective:
ONE atomic PR adding/refreshing QUICKSTART with fastest happy-path, prerequisites, and first commands.

ALLOWLIST:
- docs/dev/QUICKSTART.md

Must include:
- prerequisites (node/pnpm)
- install, test-fast, ga-verify
- how to run demo/dev server
- where to find docs

Acceptance:
- [ ] only this file changed
```

### Q-DI — Docs Indexer Wave Q

```
Q-DI — Codex Prompt: Docs Indexer Wave Q

Objective:
ONE atomic PR updating shared docs indexes to link Wave Q docs.

ALLOWLIST:
- README.md (docs links section only)
- docs/index.md or docs/README.md (links only)

Add links to:
- docs/dev/REPO_DOCTOR.md
- docs/dev/PREFLIGHT.md
- docs/dev/TEST_FIXTURES.md
- docs/release/GA_VERIFY.md
- docs/dev/DEV_COMMANDS.md
- docs/dev/TEST_PROFILES.md
- docs/dev/TROUBLESHOOTING.md
- docs/dev/QUICKSTART.md

Acceptance:
- [ ] links only
- [ ] CI green
```
