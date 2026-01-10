# Q1 Execution Objectives (Trust & Automation)

> **Status**: ACTIVE
> **Owner**: Jules (Execution Lead)
> **Period**: Q1 2026
> **Focus**: Converting Month-1 cadence into durable, automated execution.

---

## 1. Automate Trust Metric Visibility
*   **Objective**: Generate a daily "Trust Snapshot" (JSON + MD) without human intervention.
*   **Why**: Manual updates to `SECURITY_SCORECARD.json` are lagging and prone to error. We need real-time visibility into trust decay.
*   **Artifacts**: `docs/security/SECURITY_SCORECARD.json`, `scripts/ops/update_trust_scorecard.ts` (new).
*   **Success Signal**: `docs/ops/trust_snapshots/` contains daily automated reports.
*   **Owner**: Jules

## 2. Enforce GA Baseline Drift
*   **Objective**: Ensure "Required Commands" and "Locked Files" defined in `GA_DEFINITION.md` remain valid and unchanged.
*   **Why**: GA guarantees are immutable. Silent drift (e.g., removing a verify command) undermines the integrity of the release.
*   **Artifacts**: `docs/ga/GA_DEFINITION.md`, `scripts/ga/verify_ga_integrity.ts` (new).
*   **Success Signal**: CI fails if a required command is removed from `package.json` or a locked file is modified without governance.
*   **Owner**: Jules

## 3. Zero-Touch Hygiene Enforcement
*   **Objective**: Automate detection of untracked files, lockfile drift, and forbidden patterns (TODOs in docs).
*   **Why**: "Clean repo" is a core tenet. Manual `git status` checks during release are insufficient and risky.
*   **Artifacts**: `scripts/ops/check_repo_hygiene.ts` (new).
*   **Success Signal**: Pre-commit or CI step catches 100% of hygiene violations before code review.
*   **Owner**: Jules

## 4. Automated Evidence Collection
*   **Objective**: Generate the "Evidence Bundle" (SBOM, SLSA, Audit Logs) automatically on every release tag.
*   **Why**: Manual evidence collection is toil and risks missing artifacts. Compliance requires 100% completeness.
*   **Artifacts**: `scripts/generate-evidence-bundle.sh`, `.github/workflows/release.yml`.
*   **Success Signal**: Every GitHub Release has a complete, signed `evidence.tar.gz` attached automatically.
*   **Owner**: Jules

## 5. CI Flake Quarantine
*   **Objective**: Automatically detect and quarantine tests that fail non-deterministically.
*   **Why**: CI stability is trust. Flakes mask real failures and slow down velocity.
*   **Artifacts**: `scripts/ci/quarantine_flakes.ts` (new).
*   **Success Signal**: `quarantined_tests.json` is automatically updated; Main branch pass rate > 99%.
*   **Owner**: Jules
