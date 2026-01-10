# Release Cadence & Ownership

**Status:** Enforced
**Applies to:** Summit Platform V1+

This document defines the operational rhythm for releases, ensuring predictability and trust. It replaces ad-hoc release decisions with a standing cadence.

---

## 1. Release Frequency

### Target Cadence: Monthly
*   **Intent:** We aim to ship a GA release once every calendar month.
*   **Logic:** This balances the need for feature velocity with the rigor of our security and compliance gates.
*   **Flexibility:** We may ship faster (e.g., hotfixes) or slower (e.g., major architectural shifts), but the *default* expectation is monthly.

### Release Window
*   **Cut-off:** 3rd Wednesday of the month.
*   **Release Day:** 4th Tuesday of the month (allows 2 days for hotfixes before weekend).

---

## 2. Standing Rhythms

To support the monthly release, the following rhythms are mandatory:

### Weekly
*   **Monday:** **Ops Evidence Run** (`docs/ops/WEEKLY_EVIDENCE_RUNBOOK.md`).
    *   *Purpose:* Prove the system is practically healthy every week, minimizing "surprise" debt at release time.
*   **Friday:** **Dependency Review**.
    *   *Purpose:* Check for new CVEs or critical updates to avoid last-minute blockers.

### Monthly (Release Week)
*   **Monday (Week 4):** Go/No-Go Decision Meeting.
*   **Tuesday (Week 4):** GA Tag & Deploy.
*   **Wednesday-Friday (Week 4):** Stabilization & Hypercare.

---

## 3. Ownership Model

| Role | Accountable For | Primary Artifacts |
| :--- | :--- | :--- |
| **Release Captain** | End-to-end execution, Go/No-Go call, Coordination. | `GA_TO_GA_PLAYBOOK.md`, `GA_READINESS_CHECKLIST.md` |
| **Security Lead** | Vulnerability sign-off, Risk acceptance, Hardening verification. | `RISK_LEDGER.md`, `SECURITY_READINESS_REPORT.md` |
| **Ops Lead** | Environment health, Deployment execution, Evidence collection. | `WEEKLY_EVIDENCE_RUNBOOK.md`, `SLI_SLO_ALERTS.md` |
| **Docs Owner** | Release notes, Changelog, Public documentation updates. | `RELEASE_NOTES.md`, `CHANGELOG.md` |

**Note:** "Release Captain" is a rotating role. The current Captain is documented in `docs/governance/ROLES.md` (or equivalent team charter).

---

## 4. Slip & Escalation Rules

If the cadence slips:

1.  **< 1 Week Slip:**
    *   **Decision:** Release Captain Discretion.
    *   **Action:** Notify stakeholders via standard channels. Update target date.

2.  **> 1 Week Slip:**
    *   **Decision:** Requires Engineering Lead + Product Lead consensus.
    *   **Action:** Formal "Release Delay" notice. Must include specific blocking criteria and new estimated date.
    *   **Anti-Pattern:** Do not slide the date day-by-day. Pick a realistic new date (e.g., +2 weeks).

3.  **Red Gate (Stop the Line):**
    *   Any P0 Security Vulnerability or P0 Stability Issue automatically halts the release.
    *   **Override:** Only via written waiver signed by CTO/CISO.

---

## 5. Alignment with Operations
This cadence aligns with the "Month-1/Q1" operational expectations. The Weekly Evidence Run is the heartbeat that feeds the Monthly Release release. If the weekly evidence fails, the monthly release is automatically at risk.
