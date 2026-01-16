# Governance Gates Delivery Plan

This plan implements and stabilizes "Governance / Docs Integrity" and "Governance / Evidence ID Consistency" gates, ensuring Golden Path stability.

## A) Critical Path Plan

1.  **Foundation (Day 1)**: Define `docs/governance/INDEX.yml` as the single source of truth for governance documents and seed `docs/ga/evidence_map.yml` (derived from `verification-map.json`).
2.  **Implementation (Day 1-2)**: Build `scripts/governance/check_docs_integrity.js` (enforcing `INDEX.yml`) and `scripts/governance/check_evidence_ids.js` (cross-checking IDs).
3.  **CI Stabilization (Day 2-3)**: Deploy non-blocking GitHub Actions workflows (`governance-integrity.yml`, `governance-evidence.yml`) executing these scripts.
4.  **Verification (Day 3)**: Add `node:test` suites to `tests/governance/` to verify the verifiers (meta-testing).
5.  **Integration (Day 4)**: Wire checks into `_reusable-governance-gate.yml` (Unified Gate) and `package.json` scripts.
6.  **Promotion (Day 5+)**: After 3 consecutive green runs on main, promote to **Required** status via branch protection rules.

## B) PR Breakdown

### PR1: Governance / Docs Integrity (v2)
**Scope**: Establish `INDEX.yml` and drift enforcement.
*   **Files**: `docs/governance/INDEX.yml`, `scripts/governance/check_docs_integrity.js`, `.github/workflows/governance-integrity.yml`.
*   **Acceptance Criteria**:
    *   `INDEX.yml` lists all `docs/governance/*.md` files.
    *   Script fails if a file is in `docs/governance/` but not `INDEX.yml` (and vice versa).
    *   Script supports `--fix` to auto-update `INDEX.yml`.
    *   CI job "Governance / Docs Integrity" passes on valid state.
*   **Verification**: `node scripts/governance/check_docs_integrity.js` passes.
*   **Artifacts**: `governance_integrity_report.json` (execution summary).
*   **Review Routing**: Docs, Platform
*   **Dependencies**: None

### PR2: Governance / Docs Integrity (Tests)
**Scope**: Unit tests for integrity logic.
*   **Files**: `tests/governance/docs_integrity.test.js`, `scripts/governance/run_tests.js` (or update package.json).
*   **Acceptance Criteria**:
    *   `node:test` suite covers edge cases (missing file, extra file, malformed YAML).
    *   CI job "Governance / Docs Integrity (Tests)" runs `node --test tests/governance/*.test.js`.
*   **Verification**: `npm run test:governance` (or new script) passes.
*   **Artifacts**: `test-results.json` (JUnit or JSON report).
*   **Review Routing**: Platform
*   **Dependencies**: PR1

### PR3: Governance / Evidence ID Consistency
**Scope**: Evidence map and cross-check gate.
*   **Files**: `docs/ga/evidence_map.yml`, `scripts/governance/check_evidence_ids.js`, `.github/workflows/governance-evidence.yml`.
*   **Acceptance Criteria**:
    *   `evidence_map.yml` exists (seeded from `verification-map.json` or scratch).
    *   Script scans `docs/governance/*.md` for `Evidence-ID: <id>` patterns.
    *   Script fails if an ID in docs is missing from `evidence_map.yml`.
    *   CI job "Governance / Evidence ID Consistency" passes.
*   **Verification**: Run script with invalid ID in a dummy doc -> fails.
*   **Artifacts**: `evidence_consistency_report.json` (list of validated IDs).
*   **Review Routing**: Compliance, Docs
*   **Dependencies**: PR1

### PR4: Unified Gate Integration & Runbooks
**Scope**: Connect to unified gate and document usage.
*   **Files**: `.github/workflows/_reusable-governance-gate.yml`, `docs/governance/RUNBOOK.md` (or `README.md`).
*   **Acceptance Criteria**:
    *   Unified gate invokes new checks (if strict mode is on).
    *   Runbooks explain how to fix drift and add evidence IDs.
*   **Verification**: Trigger `governance-gate` workflow -> sees new checks.
*   **Artifacts**: `governance-gate-reports` (updated bundle).
*   **Review Routing**: Security, Platform
*   **Dependencies**: PR3

### PR5: Required-check Activation
**Scope**: Administrative promotion.
*   **Files**: `required-checks-exceptions.yml` (if applicable), `FINAL_GA_READINESS_CHECKLIST.md` update.
*   **Acceptance Criteria**:
    *   Links to 3 consecutive green runs provided.
    *   Rollback plan documented.
    *   (Manual) Checks added to Branch Protection rules.
*   **Verification**: Branch protection settings screenshot or verification script output.
*   **Artifacts**: `activation_checklist_signed.md`.
*   **Review Routing**: Security, Release Captain
*   **Dependencies**: PR4, 3 Green Runs

## C) Board/Issue Population

| PR | Issue Title | Priority | Labels | Milestone | Blocked By / Blocks |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Implement Governance Docs Integrity (v2) | High | `governance`, `area/docs` | v4.2.0 | - / PR2, PR3 |
| 2 | Add Tests for Governance Integrity Gates | Medium | `governance`, `kind/test` | v4.2.0 | PR1 / - |
| 3 | Implement Evidence ID Consistency Check | High | `governance`, `compliance` | v4.2.0 | PR1 / PR4 |
| 4 | Integrate Governance Gates into Unified Pipeline | Medium | `governance`, `ci` | v4.2.0 | PR3 / PR5 |
| 5 | Promote Governance Gates to Required Status | Low | `governance`, `ops` | v4.2.0 | PR4 / - |

## D) Promotion to Required Checklist

- [ ] **Stability**: 3 consecutive green runs on `main` for both jobs.
- [ ] **Performance**: Execution time < 2 minutes.
- [ ] **Determinism**: No flakes observed in last 10 runs.
- [ ] **Artifacts**: Artifact upload verification (paths checked).
- [ ] **Documentation**: `docs/governance/README.md` updated with "How to update INDEX.yml" and "How to add Evidence IDs".
- [ ] **Rollback**: Command to disable check via env var (`DISABLE_GOV_INTEGRITY=true`) or removal from branch protection.

## E) Risk Register

| Risk | Level | Mitigation | Pivot |
| :--- | :--- | :--- | :--- |
| **False Positive Drift** | Yellow | Ensure script handles OS-specific paths/sorting. | Use strict sorting in script. |
| **Evidence Map Desync** | Green | Auto-generate map skeleton if missing. | Make check warning-only initially. |
| **CI Noise** | Green | Run only on `docs/**` changes. | Restrict paths in workflow `on:` trigger. |
| **Blocker for Devs** | Yellow | Provide `--fix` command in error message. | Disable required status temporarily. |
| **Missing Evidence IDs** | Green | Allow "TBD" or "Pending" status in map. | Exclude specific docs from check. |
| **Legacy Script Conflict** | Green | Deprecate `verify-living-documents.cjs`. | Remove legacy script in PR1. |
