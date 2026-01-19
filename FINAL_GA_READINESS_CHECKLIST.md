# Final GA Readiness Checklist: Runtime Governance Enforcement

**Objective:** Determine if the Runtime Governance Enforcement initiative is complete, safe, and ready for General Availability (GA).

**Target SHA:** ____________________
**Date:** ____________________
**Release Captain:** ____________________

---

## A) Pre-Merge Readiness (Per PR)

*Verify these items for every PR related to governance enforcement (Verdict, Tenant, Kill switch, etc.).*

### 1. Verification
- [ ] **Governance Tests Pass**
  - Command: `pnpm check:governance`
  - Command: `pnpm verify:governance`
  - Command: `pnpm test:unit` (Server unit tests)
- [ ] **CI Checks Green**
  - Job: `Governance / Unified Gate` (or `check:governance` in CI)
  - Job: `config-guard`
  - Job: `security:check`
- [ ] **Policy Validation**
  - [ ] Policies defined in `docs/governance/policies/*.yml` (Verify existence and syntax)
  - [ ] Control Map updated: `compliance/control-map.yaml` matches implementation.

### 2. Artifacts & Docs
- [ ] **Documentation Updated**
  - [ ] `docs/governance/runtime_control_map.md` (or equivalent) reflects changes.
  - [ ] `AGENTS.md` updated if constraints changed.
- [ ] **Evidence Artifacts**
  - [ ] `compliance/control-map.yaml` contains correct `summit_artifacts` paths.

### 3. Sign-offs
- [ ] **Security:** ____________________
- [ ] **Backend:** ____________________
- [ ] **Platform:** ____________________

---

## B) Post-Merge Readiness (On Main)

*Verify against the specific SHA on `main`.*

### 1. Evidence Verification
- [ ] **Evidence Bundle Generation**
  - Command: `npx tsx scripts/compliance/generate_evidence.ts --control ALL`
  - Verify: Output directory `evidence/auditor-bundle-<timestamp>/` is created.
- [ ] **Evidence Map Verification**
  - Command: `npx tsx scripts/compliance/verify_governance.ts` (or `verify_compliance_drift.ts`)
  - Verify: No drift detected between `compliance/control-map.yaml` and codebase.
- [ ] **Artifact Existence**
  - Verify: `artifacts/governance/runtime/<sha>/` contains generated evidences (e.g., `boot.json`, policy snapshots).
- [ ] **Secret Scan**
  - Command: `pnpm security:check` (or `scripts/security-check.js`)
  - Verify: No secrets found in generated artifacts.

### 2. Stability
- [ ] **Job Names Stable**
  - Verify: CI job names match `REQUIRED_CHECKS_POLICY.yml` (if applicable) and are consistent.
- [ ] **Governance Runtime Tests**
  - Command: `pnpm verify:runtime` (if available) or `pnpm test:unit` specifically for `server/src/governance`.

---

## C) Required-Check Activation

*Prerequisites to promote "Governance / Unified Gate" to a blocking Required Check.*

- [ ] **Stability Proven**
  - [ ] 3 consecutive green runs on `main`.
  - [ ] No flakes > 1% over last 50 runs.
- [ ] **Artifact Uploads Confirmed**
  - [ ] CI logs show successful upload of governance artifacts.
- [ ] **Emergency Disable Procedure**
  - [ ] Documented in `RUNBOOKS/RUNTIME_GOVERNANCE_RELEASE_CAPTAIN.md`.
  - [ ] `DISABLE_GOVERNANCE_GATE` env var or equivalent mechanism tested.

---

## D) Operational Readiness

### 1. Procedures & Runbooks
- [ ] **Ops Quick Card**
  - [ ] Exists at `docs/ops/OPS_VERIFY.md`.
- [ ] **Kill Switch Procedures**
  - [ ] **Fail-Closed Verified:** `KillSwitchService.ts` defaults to safe state on error.
  - [ ] **Break-Glass Tested:**
    - Command: (Simulated) `KillSwitchService.engageGlobalKillSwitch("operator", "drill")`
    - Verify: System rejects unsafe traffic.
    - Command: (Simulated) `KillSwitchService.disengageGlobalKillSwitch("operator", "drill")`
    - Verify: System restores normal operation.
- [ ] **Incident Playbooks**
  - [ ] `docs/ops/governance-branch-protection-runbook.md` exists.
  - [ ] Rollback procedure defined in `docs/ops/ROLLBACK_PLAYBOOK.md`.

### 2. Observability
- [ ] **Telemetry Contract**
  - [ ] Logs: `governance_events.jsonl` (or structured logs) are being emitted.
  - [ ] Metrics: Prometheus metrics for policy decisions are registered (e.g., `policy_decisions_total`).
- [ ] **Performance Budgets**
  - [ ] Latency impact < 5ms (or documented exception).
  - [ ] Checked via `pnpm optimize:check`.

---

## E) Audit Evidence Readiness

### 1. Evidence Items
- [ ] **Evidence IDs Present**
  - [ ] `compliance/control-map.yaml` has IDs (e.g., `CC1.1`, `CC6.1`).
- [ ] **JSON Fields**
  - [ ] Generated `metadata.json` includes: `controlId`, `generatedAt`, `scope`.
- [ ] **Policy Versioning**
  - [ ] `docs/governance/policies/policy_version.txt` (or hash in `metadata.json`) is recorded.
- [ ] **Artifact Retention**
  - [ ] Procedure documented for long-term storage (e.g., S3 bucket or repo archive).

---

## F) Exception Register (Time-Bounded)

*List any known acceptable deviations.*

| Exception ID | Description | Risk Level | Expiry Date | Mitigation | Approvers | Issue Link |
|--------------|-------------|------------|-------------|------------|-----------|------------|
| (e.g. EXC-01)| Legacy API bypass | Medium | 2024-12-31 | Rate limited | @sec-lead | #123 |
|              |             |            |             |            |           |            |
|              |             |            |             |            |           |            |

---

## G) “GA Declaration” Statement

**Declaration:**
I, [Release Captain Name], declare that the Runtime Governance Enforcement initiative is **GA Ready**.
This release includes full tenant isolation, kill switch capabilities, and verified audit trails.
Verification has been performed using `scripts/ga-gate.sh` and `scripts/compliance/generate_evidence.ts`.
All critical tests have passed. Exceptions listed above are risk-accepted and time-bounded.

**Approved By:**
- **Engineering:** ____________________
- **Product:** ____________________
- **Security:** ____________________

**Date:** ____________________
