# Governance Extensions for V2

This document extends the V1 Governance Framework (`docs/GOVERNANCE.md`) to support V2 operations.

## 1. Tracking V2 Experiments

All V2 experiments must be tracked in the Governance Ledger (or equivalent registry).

- **Registry:** `docs/v2/EXPERIMENT_REGISTRY.md` (or tracked via issues/labels).
- **Metadata Required:**
  - Owner
  - Start Date
  - Review Date (max 90 days out)
  - Class (usually A or B)

## 2. Promotion Decisions

Promoting code from `packages/v2-sandbox/` to the Core requires an explicit **Promotion Decision**.

**Evidence Required:**

- **Test Results:** Pass rate > 99%.
- **Security Scan:** No High/Critical vulnerabilities.
- **Governance Check:** Compliance with V1 Schemas.
- **Code Review:** 2+ approvers.

**Output:**
A "Promotion Record" must be committed (e.g., a PR comment or file entry) stating:

> "Promoted Experiment [ID] to Core on [Date] by [Approver]."

## 3. Rejection & Sunset

If an experiment fails or expires:

- **Action:** Code removal or move to `archive/`.
- **Record:** "Retired Experiment [ID] on [Date]."

## 4. Updates to Policy-as-Code

(Future) New OPA policies may be introduced to enforce Sandbox isolation (e.g., verifying imports).
