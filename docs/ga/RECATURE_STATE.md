# GA Recapture State (Phase 0–1)

**Mode:** Sensing (evidence-first).  
**Authority Anchors:** Constitution + Meta-Governance + Agent Mandates + Summit Readiness Assertion.  
**Summit Readiness Assertion:** `docs/SUMMIT_READINESS_ASSERTION.md` (reference enforced).

## Evidence Index (Raw)

**Phase 0 (Ground Truth)** — `evidence/ga-recature/phase0/`

- `commands.txt`
- `git-status.txt`
- `git-remote.txt`
- `git-head.txt`
- `git-log-20.txt`
- `node-version.txt`
- `pnpm-version.txt`
- `python-version.txt`
- `docker-version.txt`
- `ls-la.txt`
- `find-ga-release-evidence.txt`
- `makefile-head.txt`
- `makefile-ga-preflight-release.txt`
- `github-workflows.txt`
- `gh-auth-status.txt`
- `git-log-merges-200.txt`
- `git-log-pr-refs-200.txt`

**Phase 1 (Gate Execution)** — `evidence/ga-recapture/phase1/`

- `commands.txt`
- `make-preflight.txt`
- `pnpm-recursive-test.txt`
- `pnpm-ci-parity-verify.txt`
- `make-ga.txt`

## Phase 0 — Ground Truth Snapshot

### Repo & Toolchain

- **Branch:** `work` (dirty workspace — pre-existing modifications in `pnpm-lock.yaml` and `verification/*.png`).
- **HEAD:** `87013591997a469e912b7f34883d2df2c7d540dc`.
- **Remote:** none configured (intentionally constrained; deferred pending remote registration).
- **Node:** v20.19.6.
- **pnpm:** 10.26.0.
- **Python:** 3.12.12.
- **Docker:** missing (`docker` command not found; deferred pending Docker install).

### Detected GA Entry Points / Gates

- **Make targets:** `ga`, `ga-verify`, `claude-preflight` found in `Makefile`.
- **GA Gate script:** `scripts/ga-gate.sh` invoked by `make ga`.
- **Workflow inventory:** `evidence/ga-recature/phase0/github-workflows.txt`.

### Recent Merged PR Inventory (Best-Effort)

- **Merge log:** `evidence/ga-recature/phase0/git-log-merges-200.txt`.
- **PR refs in history:** `evidence/ga-recature/phase0/git-log-pr-refs-200.txt`.

### Missing Tooling / Preconditions

- **gh CLI:** not installed (deferred pending `gh` install + auth).
- **Docker CLI:** not installed (deferred pending Docker install).
- **Python venv:** `.venv` missing for GA gate linting (intentionally constrained; see Phase 1).

### Initial Risk List (Evidence-Backed)

1. **GA gates depend on Docker and venvs** — Docker missing and `.venv` absent (risk: GA gate cannot execute full lint/test path).
2. **Pre-existing dirty workspace** — `pnpm-lock.yaml` + `verification/*.png` already modified (risk: evidence contamination).
3. **No gh CLI** — merged PR recapture limited to git history (risk: incomplete PR ledger).

## Phase 1 — Gate Execution Results

### Commands Run (Exact)

- `make preflight || true`
- `pnpm -r test || true`
- `pnpm ci:parity && pnpm ci:verify || true`
- `make ga || true`
- `make ga-verify || true`

### Pass/Fail Summary (with Evidence)

| Gate                               | Result   | Evidence                                                 | Failure Signature                                                              |
| ---------------------------------- | -------- | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `make preflight`                   | **FAIL** | `evidence/ga-recapture/phase1/make-preflight.txt`        | `apps/workflow-engine` Jest setup file missing (`tests/utils/jest-setup.cjs`). |
| `pnpm -r test`                     | **FAIL** | `evidence/ga-recapture/phase1/pnpm-recursive-test.txt`   | Same `apps/workflow-engine` Jest setup error.                                  |
| `pnpm ci:parity && pnpm ci:verify` | **FAIL** | `evidence/ga-recapture/phase1/pnpm-ci-parity-verify.txt` | `ci:parity` script missing.                                                    |
| `make ga`                          | **FAIL** | `evidence/ga-recapture/phase1/make-ga.txt`               | `.venv/bin/ruff` missing; GA gate halted in lint step.                         |
| `make ga-verify`                   | **FAIL** | `evidence/ga-recapture/phase1/make-ga-verify.txt`        | Verification map missing `Media Authenticity & Provenance`.                    |

### Top Failure Signatures (Actionable)

1. **Workflow Engine Jest setup file missing** — `apps/workflow-engine/tests/utils/jest-setup.cjs` not found.
2. **GA lint path assumes `.venv`** — `make ga` fails with `.venv/bin/ruff` missing.
3. **CI parity scripts absent** — `pnpm ci:parity` not defined in root scripts.
4. **GA verification map drift** — `Media Authenticity & Provenance` missing from Tier B map.

### GA Delta List (Initial)

- **GA-1:** Fix `apps/workflow-engine` Jest setup path or restore `tests/utils/jest-setup.cjs`.
- **GA-2:** Harden `make ga` lint path to bootstrap `.venv` or use `python -m ruff/mypy` fallback.
- **GA-3:** Add/restore `ci:parity` and `ci:verify` scripts or update GA playbook to current equivalents.
- **GA-4:** Lint warnings in `contracts/integration` + `evals/runner` should be resolved or formally governed as exceptions.
- **GA-5:** Update `docs/ga/verification-map.json` and related GA verification docs to include `Media Authenticity & Provenance`.

## Next Actions (Phase 2)

- Build GA delta backlog + PR train plan (`docs/ga/GA_DELTA_BACKLOG.md`, `docs/ga/PR_TRAIN_PLAN.md`).
- Keep evidence-first discipline; no production changes before ordered PRs.

**End State:** Ground truth captured. GA gate not green. Execution is intentionally constrained pending remediation.
