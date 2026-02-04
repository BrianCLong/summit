Owner: Governance
Last-Reviewed: 2026-01-20
Evidence-IDs: none
Status: active

# Steady-State Governance Runbook

This runbook defines the operational procedures for maintaining governance posture in the General Availability (GA) steady state.

## 1. Ownership & Roles

| Component | Owner | Responsibilities |
| :--- | :--- | :--- |
| **Governance Gates** | Release Captain | Monitoring gate health, authorizing overrides. |
| **Evidence Manifests** | Release Captain | Ensuring evidence completeness for releases. |
| **Policy Definition** | Governance Board | Approving changes to `GOVERNANCE_RULES.md` and `policy/`. |
| **Weekly Snapshots** | Release Captain | Generating and reviewing the weekly GA Ops Snapshot. |

## 2. Change Management

### Routine Changes
*   **Scope:** Dependency updates, bug fixes, non-breaking features.
*   **Process:** Standard PR review. CI checks pass automatically.
*   **Review:** Peer review sufficient.

### Policy Changes
*   **Scope:** Modifications to `docs/governance/`, `.github/workflows/`, or `policy/`.
*   **Process:**
    1.  Open PR with justification.
    2.  **Governance Drift Check** will detect change.
    3.  **Release Captain** must approve.
    4.  Drift is accepted by merging (updating the hash).

## 3. Incident Handling

### Governance Drift Alert
**Trigger:** `governance-drift-check` workflow fails or opens an issue.

**Response:**
1.  **Acknowledge:** Release Captain assigns the issue.
2.  **Investigate:**
    *   Was this a planned change? -> If yes, verify PR approvals were followed.
    *   Was this unauthorized? -> **Security Incident**. Revert immediately.
3.  **Remediate:**
    *   **Authorized:** No action needed (workflow self-heals on merge).
    *   **Unauthorized:** Revert commit, rotate credentials if CI was compromised.

### Evidence Freshness Drop
**Trigger:** `fresh-evidence-rate` metric drops below 95%.

**Response:**
1.  **Investigate:** Check recent CI runs for `ci-verify` or `evidence-collection` failures.
2.  **Fix:** Repair broken tests or build steps.
3.  **Verify:** Trigger manual run of `fresh-evidence-rate` to confirm recovery.

## 4. Weekly Rituals

**Monday:**
1.  Release Captain reviews the **Weekly GA Ops Snapshot**.
2.  Check for open Drift Issues.
3.  Verify Evidence Freshness Rate is green.
4.  Sign off on the snapshot.
