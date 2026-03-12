> Owner: Governance
> Last-Reviewed: 2026-03-15
> Evidence-IDs: EVD-GOLDEN-MAIN
> Status: active

# Golden Main Governance Specification

This document defines the explicit governance model for `main`, the foundational reference branch of Summit. It establishes the criteria for a valid golden main state, required checks, evidence expectations, archival discipline, and reconciliation policies.

## 1. Golden Main Definition

The `main` branch (Golden Main) is the absolute source of truth for the Summit platform. A valid Golden Main state is defined as:

*   **100% Deterministic Passing CI**: Every commit on `main` must pass all CI checks without exception. "It works locally" is not a defense; if CI fails, the state is broken.
*   **Audit-Ready**: The codebase must continuously pass all compliance, security, and governance checks defined in `.github/workflows/` (e.g., `ci.yml`, `ga-gate.yml`, `governance-meta-gate.yml`, `soc-controls.yml`).
*   **Evidence Backed**: Every structural change must be associated with an authenticated Pull Request, verifiable testing evidence, and an explicit trace to an intentional capability or fix.
*   **Non-Drifting**: Governance documentation and critical CI configurations must strictly align with the established baseline (as verified by `governance_drift_detector.mjs`).

## 2. Required Checks Before Merge

No commit may be introduced to `main` without passing the following non-negotiable CI gates defined in `REQUIRED_CHECKS_CONTRACT.yml`:

1.  **CI / Unit Tests**: `pnpm test:unit` and standard test suites must pass (`ci.yml`).
2.  **GA Gate (`gate`)**: Production readiness assertions and integrations (`ga-gate.yml`).
3.  **Governance Meta Gate (`meta-gate`)**: Verification of PR metadata (S-AOS blocks, changelogs, agent boundaries).
4.  **SOC Controls**: Enforcement of supply chain and fundamental security posture (`soc-controls.yml`).
5.  **Unit Tests & Coverage**: Adherence to the monorepo code coverage thresholds enforced via `pnpm coverage:gate` (`unit-test-coverage.yml`).

**Approval Requirements:**
*   All Pull Requests must be approved by at least one authorized Codeowner (or two for restricted surfaces).
*   Changes affecting the Governance lane (`docs/governance/**`) or CI lane (`.github/workflows/**`) require explicit secondary validation to prevent policy subversion.

## 3. Evidence Expectations

Every PR merged to `main` must produce and retain verifiable evidence artifacts.

*   **Expected Artifacts**: Unit test results, linting logs, SAST/DAST scan reports, and PR lifecycle events.
*   **Freshness Requirement**: Evidence artifacts (e.g., test logs, scan results) must be generated within **24 hours** of the release build.
*   **Schema Versions**: Evidence payloads must conform to the current schemas in `schemas/governance/`. The structure must be verifiable by `tools/ci/verify_evidence.py`.
*   **Validation Commands**:
    *   `scripts/ci/verify_evidence_id_consistency.mjs`
    *   `scripts/compliance/check_drift.ts`
    *   `tools/ci/verify_evidence.py`

## 4. Archival Discipline

Artifacts supporting Golden Main stability are structured into **Ops Evidence Packs** and retained systematically:

*   **Workflow Artifacts**: Retained for **90 days** for short-term debugging and post-deployment verification.
*   **Weekly Ops Packs**: Snapshots of operational health retained for **1 year** to support governance reviews and audits.
*   **Release-Adjunct Packs**: Retained for **3 years** to ensure availability for the lifecycle of major versions.
*   **External Storage Exports**: Export receipts confirming transfer to immutable WORM compliance buckets are retained for **7 years** for legal hold verification.

*Naming & Indexing*: Packs are cryptographically signed archives (`.tar.gz`) registered in a centralized `provenance-ledger` which records their existence, location, and checksums.

## 5. Merge Policy

The Merge Engine strictly protects Golden Main through deterministic rules:

*   **Merge Method**: **Squash and Merge** is the only permitted method. This guarantees a linear, atomic commit history.
*   **Commit Message Format**: The squash commit must follow Conventional Commits syntax and embed the PR reference (e.g., `feat(ui): add risk widget (#123)`). The PR description (containing Commander's Intent and Abuse Analysis) must be preserved in the extended commit body.
*   **Who Can Merge**: Direct pushes are universally blocked. Merges are executed exclusively by the automated Merge Engine or highly privileged automation after all lane criteria (e.g., `LANE/auto-merge-now` or `LANE/fix-forward-fast`) are explicitly satisfied.

## 6. Reconciliation Policy

In the event that `main` diverges or becomes blocked:

*   **Divergence / Main is Red**: If a commit breaks `main`, the response is immediate rollback (revert). The breaking change is isolated in a `LANE/quarantine` PR for fix-forward actions to restore the Green CI Contract immediately.
*   **Stale PR Resolution**: Oversized or stale PRs (e.g., inactive for > 14 days or quarantined for > 7 days) are swept out of the active queue and closed via `LANE/capture-close` to maintain velocity. Authors must re-evaluate and submit fresh, smaller PRs.
*   **Conflict Resolution**: PRs with merge conflicts are pushed to the bottom of the Merge Engine queue (`LANE/conflicts`). Authors are strictly responsible for rebasing their branches (`git rebase origin/main`).

## 7. Exception Process

Any deviation from this specification requires formal documentation and structured approval:

1.  **Escalation**: Exceptions cannot be granted implicitly. They must be proposed with a documented business case.
2.  **Documentation**: The deviation must be logged in `docs/governance/EXCEPTION_REGISTER.md`.
3.  **Required Metadata**: Every exception entry must list the scope, owner, technical justification, and a specific **sunset condition** or expiry date (reviewed on a 30/60/90 cadence).
4.  **Approval**: Exceptions require sign-off from the AI Safety Board or designated governance authority before execution.
