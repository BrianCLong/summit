# GA-to-GA Playbook

**Status:** Canonical
**Owner:** Release Captain
**Applies to:** Summit Platform V1+

This playbook defines the standardized lifecycle for moving from one General Availability (GA) release to the next. It codifies the process used for the January 2026 GA to ensure repeatability, predictability, and safety.

---

## Phase 1: Pre-GA Hardening
**Objective:** Prepare the codebase and infrastructure for release lock.
**Entry Criteria:** Feature work for the target milestone is code-complete.

### 1.1 Security Hardening
*   **Action:** Execute the hardening suite to enforce baseline security configurations.
*   **Command:** `./scripts/security-hardening-suite.sh`
*   **Verification:** Script returns exit code 0. No critical failures in output.
*   **Artifacts:** Hardening report (console output).

### 1.2 Vulnerability Sweep
*   **Action:** Scan all dependencies and container images for known CVEs.
*   **Command:** `./scripts/scan-vulnerabilities.sh`
*   **Gate:** Zero Critical/High vulnerabilities. Exceptions must be documented in `docs/security/EXCEPTIONS_REGISTRY.md`.

### 1.3 Ops Readiness & Evidence
*   **Action:** Verify operational state and generate weekly evidence.
*   **Command:** Follow `docs/ops/WEEKLY_EVIDENCE_RUNBOOK.md`.
*   **Gate:** Most recent weekly evidence run must be green (`status: pass`).

---

## Phase 2: Security Closure
**Objective:** Finalize the security posture and sign off on risk.
**Entry Criteria:** Hardening and Vulnerability sweeps are green.

### 2.1 Artifact Signing
*   **Action:** Sign all build artifacts and generate provenance.
*   **Command:** `./scripts/sign-artifacts.sh`
*   **Verification:** `cosign` verifies signature validity.

### 2.2 Traceability Check
*   **Action:** Ensure all requirements and code paths are traceable.
*   **Command:** `node scripts/check_traceability.cjs`
*   **Gate:** 100% coverage of critical paths (or approved waiver).

### 2.3 Deferred Risk Ledger
*   **Action:** Review `docs/security/RISK_LEDGER.md`.
*   **Gate:** All open risks must be accepted by Security Lead for this specific release version.

---

## Phase 3: GA Truth-Lock
**Objective:** Freeze the codebase and declare the release candidate.
**Entry Criteria:** Security Closure is complete.

### 3.1 Code Freeze
*   **Action:** Enable the repository freeze mechanism to prevent non-critical merges.
*   **Command:** `./scripts/enable-freeze.sh` (if available) or manual announcement.
*   **Verification:** Merge train is paused or restricted to `hotfix/*` branches.

### 3.2 Go/No-Go Decision
*   **Action:** Execute the core decision logic.
*   **Command:** `./scripts/ga-core-go-nogo.sh --run-validate --run-load --deploy-staging`
*   **Gate:** Script returns success for Validation, Load, and Staging Deploy.

### 3.3 Release Candidate (RC) Cut
*   **Action:** Tag the release candidate.
*   **Command:** `git tag -a vX.Y.Z-rc.1 -m "Release Candidate 1"`
*   **Verification:** CI triggers `release-train.yml` and produces artifacts.

---

## Phase 4: GA Launch
**Objective:** Publicly release the version.
**Entry Criteria:** RC has survived stabilization period (min 48 hours).

### 4.1 Final Tagging
*   **Action:** Tag the final GA version.
*   **Command:** `git tag -a vX.Y.Z -m "GA Release vX.Y.Z"`
*   **Verification:** GitHub Release created with attached Evidence Bundle.

### 4.2 Documentation Publication
*   **Action:** Publish `docs/release/RELEASE_NOTES.md`.
*   **Verification:** Release notes are visible on the internal portal/repo.

---

## Phase 5: Post-GA Stabilization (Week-0)
**Objective:** Monitor for immediate regressions.
**Entry Criteria:** GA Tag is pushed.

### 5.1 Hypercare Monitoring
*   **Action:** Release Captain monitors SLO dashboards daily.
*   **Reference:** `docs/ops/SLI_SLO_ALERTS.md`
*   **Exit Criteria:** 5 days with no P0/P1 incidents.

### 5.2 Freeze Thaw
*   **Action:** Lift the code freeze.
*   **Command:** `./scripts/disable-freeze.sh` (or manual announcement).

---

## Phase 6: Steady-State & Next Trigger
**Objective:** Maintain health and prepare for the next cycle.

### 6.1 Weekly Cadence
*   **Action:** Resume `docs/ops/WEEKLY_EVIDENCE_RUNBOOK.md`.

### 6.2 Next-GA Trigger
*   **Trigger:** Date-based (Monthly) or Feature-based (Major Epic completion).
*   **Action:** Release Captain initializes `docs/releases/GA_PLAN.md` for the next version.
