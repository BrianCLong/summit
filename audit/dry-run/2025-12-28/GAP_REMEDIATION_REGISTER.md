# Gap & Remediation Register

**Date:** 2025-12-28  
**Purpose:** Record audit dry-run gaps with severity, root cause, owner, and time-bound remediation.

## Summary

| Severity | Count |
| -------- | ----- |
| Critical | 1     |
| Major    | 2     |
| Minor    | 2     |

## Gaps

| ID    | Severity     | Gap                                                                              | Root Cause                                               | Remediation Owner           | Time to Fix | Compensating Control                                                                         |
| ----- | ------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| G-001 | **Critical** | No signed Go/No-Go decision record for MVP-3-GA dry-run (template only).         | Decision record not captured in `GO_NO_GO_GATE.md`.      | Release Captain + Exec Team | 2 days      | Enforce freeze policy in `LAUNCH_SCOPE.md` until Go/No-Go is signed.                         |
| G-002 | **Major**    | Formal graduation decision evidence missing (no recorded approval or rejection). | Graduation workflow documented but no ledgered decision. | Governance Lead             | 5 days      | Maintain feature flags off for any ungraduated units; require manual approvals for exposure. |
| G-003 | **Major**    | Security exception **EX-2025-002** expired but still marked Active.              | Exception review cadence not enforced.                   | Security Lead               | 3 days      | Apply temporary log redaction or disable debug logging in dev cluster.                       |
| G-004 | **Minor**    | Experiment charter + exit criteria for `experimental_batch_import` not found.    | Experiment documentation not linked to feature flag.     | Data Eng Lead               | 5 days      | Keep flag default-off + require guardrail gate in `feature-flags/flags.yaml`.                |
| G-005 | **Minor**    | Change rollback evidence lacks explicit CAB linkage.                             | Release evidence stored separately from approval log.    | Ops/SRE Lead                | 7 days      | Attach CAB ticket references to deployment logs going forward.                               |

## Remediation Plan (Time-Boxed)

### Immediate (0–7 days)

- G-001: Execute Go/No-Go decision record with signatures.
- G-003: Close or renew EX-2025-002; update exceptions registry with date and compensating controls.
- G-004: Add experiment charter + exit criteria for `experimental_batch_import` and link in evidence index.

### Near-Term (8–30 days)

- G-002: Record graduation decisions in governance ledger and link from `docs/SHIPPING_GRAPH.md`.
- G-005: Add CAB ticket references to deployment evidence artifacts and change-management logs.

---

**Prepared by:** External Audit Readiness Lead
