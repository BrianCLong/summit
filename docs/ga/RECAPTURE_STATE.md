# GA Recapture State (Phase 0–1)

**Mode:** Sensing (evidence-first).
**Authority Anchors:** Constitution + Meta-Governance + Agent Mandates + Summit Readiness Assertion.
**Summit Readiness Assertion:** `docs/SUMMIT_READINESS_ASSERTION.md` (reference enforced).

## Evidence Index (Raw)

**Phase 0 (Ground Truth)** — `evidence/ga-recapture/phase0/`

- `commands.txt`
- `ground-truth.txt`

**Phase 1 (Gate Execution)** — `evidence/ga-recapture/phase1/`

- `commands.txt`
- `make-ga-verify.txt`

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
- **Workflow inventory:** captured in `evidence/ga-recapture/phase0/ground-truth.txt` (bounded).

### Recent Merged PR Inventory (Best-Effort)

- **Merge log:** deferred pending bounded capture (see `commands.txt` for re-run).
- **PR refs in history:** deferred pending bounded capture (see `commands.txt` for re-run).

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

- `make ga-verify || true`

### Pass/Fail Summary (with Evidence)

| Gate             | Result   | Evidence                                          | Failure Signature                                           |
| ---------------- | -------- | ------------------------------------------------- | ----------------------------------------------------------- |
| `make ga-verify` | **FAIL** | `evidence/ga-recapture/phase1/make-ga-verify.txt` | Verification map missing `Media Authenticity & Provenance`. |

### Top Failure Signatures (Actionable)

1. **GA verification map drift** — `Media Authenticity & Provenance` missing from Tier B map.
2. **Full preflight + GA gate runs deferred** — intentionally constrained to keep evidence bundles bounded; use `commands.txt` to re-run.

### GA Delta List (Initial, Provisional)

Full preflight and GA gate runs are **deferred pending bounded evidence capture**, so items GA-2..GA-5 remain provisional until full gate execution is recaptured.

- **GA-1:** Update `docs/ga/verification-map.json` and related GA verification docs to include `Media Authenticity & Provenance`.
- **GA-2:** Fix `apps/workflow-engine` Jest setup path or restore `tests/utils/jest-setup.cjs` (deferred pending preflight).
- **GA-3:** Harden `make ga` lint path to bootstrap `.venv` or use `python -m ruff/mypy` fallback (deferred pending full GA gate).
- **GA-4:** Add/restore `ci:parity` and `ci:verify` scripts or update GA playbook to current equivalents (deferred pending preflight).
- **GA-5:** Lint warnings in `contracts/integration` + `evals/runner` should be resolved or formally governed as exceptions (deferred pending preflight).

## Next Actions (Phase 2)

- Build GA delta backlog + PR train plan (`docs/ga/GA_DELTA_BACKLOG.md`, `docs/ga/PR_TRAIN_PLAN.md`).
- Keep evidence-first discipline; no production changes before ordered PRs.

**End State:** Ground truth captured. GA gate not green. Execution is intentionally constrained pending remediation.
