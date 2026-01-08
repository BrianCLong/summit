# MVP-4 Post-GA Stabilization Plan (Day 0–14)

**Authority Anchor:** `docs/SUMMIT_READINESS_ASSERTION.md`
**Scope:** Stabilization-only; no feature releases permitted during this window. (Policy: `docs/release/PATCH_PROCESS.md`)
**Source of Commitments:** `docs/ga/GA_DEFINITION.md` (Part 12), `docs/release/GA_READINESS_REPORT.md`, `docs/releases/v4.0.0/MVP4-GA-READINESS.md`

## Tracker Summary

- **Total Items:** 13
- **P0 Items:** 5
- **P1 Items:** 6
- **P2 Items:** 2
- **Unassigned:** 13

**Next P0 Execution Targets:**
1. [STAB-01] CI Parity & Smoke Verification
2. [STAB-02] Security Baselines & SBOM
3. [STAB-03] Enable pnpm audit in CI
4. [STAB-04] Mitigate Policy Bypass Risk
5. [STAB-05] Secrets Hygiene Verification

## 1) Operating Constraints (Non-Negotiable)

- **Change class**: Critical Hotfix or Standard Patch only; Feature Releases are **not permitted**. (Policy: `docs/release/PATCH_PROCESS.md`)
- **Branching**: All fixes originate from the GA tag, then backported. (Policy: `docs/release/PATCH_PROCESS.md`)
- **Evidence**: Every action must land in `docs/release/GA_EVIDENCE_INDEX.md` with logs/artifacts. (Requirement: `docs/release/GA_EVIDENCE_INDEX.md`)
- **Governed Exceptions**: Any deferred requirement is recorded with remediation + expiry. (Waivers: `docs/ga/GA_DEFINITION.md` Part 11)

## 2) Stabilization Goals (Day 0–14)

- **Critical Week 1 commitments executed** per GA definition. (Source: `docs/ga/GA_DEFINITION.md` Part 12.1)
- **Full CI and security baselines captured** in evidence index. (Source: `docs/release/GA_READINESS_REPORT.md`)
- **Hypercare monitoring enforced for first 72 hours.** (Source: `docs/releases/v4.0.0/MVP4-GA-READINESS.md`)

## 3) Work Plan (Execution Tracker)

| ID | Item | Priority | Owner | Target | Status | Ticket |
| -- | ---- | -------- | ----- | ------ | ------ | ------ |
| STAB-01 | CI Parity & Smoke Verification | P0 | UNASSIGNED | Week 1 | Backlog | [STAB-01](STABILIZATION_TICKETS.md#stabilizationp0-ci-parity--smoke-verification) |
| STAB-02 | Security Baselines & SBOM | P0 | UNASSIGNED | Week 1 | Backlog | [STAB-02](STABILIZATION_TICKETS.md#stabilizationp0-security-baselines--sbom) |
| STAB-03 | Enable pnpm audit in CI | P0 | UNASSIGNED | Week 1 | Backlog | [STAB-03](STABILIZATION_TICKETS.md#stabilizationp0-enable-pnpm-audit-in-ci) |
| STAB-04 | Mitigate Policy Bypass Risk | P0 | UNASSIGNED | Week 1 | Backlog | [STAB-04](STABILIZATION_TICKETS.md#stabilizationp0-mitigate-policy-bypass-risk-r-02) |
| STAB-05 | Secrets Hygiene Verification | P0 | UNASSIGNED | Week 1 | Backlog | [STAB-05](STABILIZATION_TICKETS.md#stabilizationp0-secrets-hygiene-verification-r-04) |
| STAB-06 | Operational Monitoring & Error Budgets | P1 | UNASSIGNED | Week 1 | Backlog | [STAB-06](STABILIZATION_TICKETS.md#stabilizationp1-operational-monitoring--error-budgets) |
| STAB-07 | Governance Verification & Signed Approvals | P1 | UNASSIGNED | Week 1 | Backlog | [STAB-07](STABILIZATION_TICKETS.md#stabilizationp1-governance-verification--signed-approvals) |
| STAB-08 | Test Reliability & Quarantined Tests | P1 | UNASSIGNED | Week 2 | Backlog | [STAB-08](STABILIZATION_TICKETS.md#stabilizationp1-test-reliability--quarantined-tests) |
| STAB-09 | API Determinism Audit | P1 | UNASSIGNED | Week 2 | Backlog | [STAB-09](STABILIZATION_TICKETS.md#stabilizationp1-api-determinism-audit) |
| STAB-10 | Load Testing Evidence | P1 | UNASSIGNED | Week 2 | Backlog | [STAB-10](STABILIZATION_TICKETS.md#stabilizationp1-load-testing-evidence) |
| STAB-11 | Integration Tests | P1 | UNASSIGNED | Week 2 | Backlog | [STAB-11](STABILIZATION_TICKETS.md#stabilizationp1-integration-tests) |
| STAB-12 | Type Safety Audit & Strict Linting | P2 | UNASSIGNED | Week 2 | Backlog | [STAB-12](STABILIZATION_TICKETS.md#stabilizationp2-type-safety-audit--strict-linting) |
| STAB-13 | Create ADR-009 | P2 | UNASSIGNED | Week 1 | Backlog | [STAB-13](STABILIZATION_TICKETS.md#stabilizationp2-create-adr-009) |

## 4) Verification Gates (Each Patch)

- **Patch classification** documented and approved. (Policy: `docs/release/PATCH_PROCESS.md`)
- **Reproduction and fix** documented with a minimal test when code is touched. (Policy: `docs/release/PATCH_PROCESS.md`)
- **CI green**: `make ci` and `make smoke` logs captured. (Source: `docs/release/GA_READINESS_REPORT.md`)
- **Drift check** executed if required by patch scope. (Policy: `docs/release/PATCH_PROCESS.md`)

## 5) Evidence Capture Checklist (Day 0–14)

| Item          | Command/Artifact                       | Evidence Location                   |
| ------------- | -------------------------------------- | ----------------------------------- |
| CI parity     | `make ci`                              | `docs/release/GA_EVIDENCE_INDEX.md` |
| Smoke         | `make smoke`                           | `docs/release/GA_EVIDENCE_INDEX.md` |
| Security scan | `npm run security:check`               | `docs/release/GA_EVIDENCE_INDEX.md` |
| SBOM          | `npm run generate:sbom` -> `sbom.json` | `docs/release/GA_EVIDENCE_INDEX.md` |
| Provenance    | `npm run generate:provenance`          | `docs/release/GA_EVIDENCE_INDEX.md` |
| Governance    | `npm run verify:governance`            | `docs/release/GA_EVIDENCE_INDEX.md` |
| Living docs   | `npm run verify:living-documents`      | `docs/release/GA_EVIDENCE_INDEX.md` |
| Hypercare log | Monitoring snapshots                   | `docs/release/GA_EVIDENCE_INDEX.md` |

## 6) Risk Ledger (Stabilization Window)

Merged into Execution Tracker (Items STAB-04, STAB-05, STAB-09).

## 7) Governed Exceptions (If Needed)

- Record any deferred requirements using the waiver template and include expiry. (Process: `docs/ga/GA_DEFINITION.md` Part 11)
- List each exception in `docs/release/GA_EVIDENCE_INDEX.md` with remediation target.

## 8) Exit Criteria (Day 14)

- **All Week 1 commitments complete** with evidence.
- **Week 2 audits complete** with remediation or Governed Exceptions documented.
- **CI green with deterministic smoke evidence** captured for the stabilization release.

**Status:** Active Execution (See Tracker)
