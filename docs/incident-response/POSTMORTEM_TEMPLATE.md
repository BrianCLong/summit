# Postmortem Template

**Incident ID:** [INC-YYYY-MM-DD-001]
**Date:** [YYYY-MM-DD]
**Authors:** [Names]
**Status:** [Draft | Review | Published]

---

## Executive Summary
*A concise summary of what happened, the impact, and the resolution. Written for a non-technical audience.*

## Impact
*   **User Impact:** [e.g., 500 users unable to login for 30 mins]
*   **Duration:** [Start Time] to [End Time] (Total: XX mins)
*   **Revenue Impact:** [If applicable]

## Root Cause
*The fundamental technical or process failure that led to the incident. Use the "5 Whys" technique.*

## Timeline
*   **[HH:MM]** - Detection (Alert fired)
*   **[HH:MM]** - Incident Declared (SEV-X)
*   **[HH:MM]** - Mitigation Attempt 1 (Failed)
*   **[HH:MM]** - Diagnosis Confirmed
*   **[HH:MM]** - Mitigation Applied (Success)
*   **[HH:MM]** - Resolved

## Contributing Factors
*   **Technical:** [e.g., connection pool limit too low]
*   **Process:** [e.g., canary deploy was skipped]
*   **Human:** [e.g., documentation was outdated]

## Lessons Learned
### What went well?
*   [e.g., Alerting fired immediately]
*   [e.g., Rollback was fast]

### What went wrong?
*   [e.g., Logs were missing correlation IDs]
*   [e.g., Contact info for 3rd party vendor was missing]

### Where did we get lucky?
*   [e.g., Incident happened during low traffic]

## Action Items / Remediation
| ID | Task | Type | Owner | Priority | Ticket |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Increase connection pool limit | Fix | @alice | P0 | TKT-123 |
| 2 | Add alert for pool exhaustion | Detection | @bob | P1 | TKT-124 |
| 3 | Update runbook for DB outages | Doc | @charlie | P2 | TKT-125 |

## Appendix
*   [Link to Graphs]
*   [Link to Logs]
*   [Link to War Room Archive]
