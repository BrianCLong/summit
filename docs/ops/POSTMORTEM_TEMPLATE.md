# Post-Incident Postmortem

**Incident ID:** INC-YYYY-MM-DD-XX
**Date:** YYYY-MM-DD
**Authors:** [Names]
**Status:** [Draft | Review | Complete]
**Severity:** [SEV-1 | SEV-2 | SEV-3]

## 1. Executive Summary

_A concise summary of what happened, the impact, and the root cause. (Target audience: Executives)_

## 2. Impact

- **Duration:** [Start Time] to [End Time] (Total: XX mins)
- **Affected Services:** [List services]
- **User Impact:** [Number of users affected, types of errors seen]
- **Data Impact:** [Data loss, corruption, or none]

## 3. Timeline

_All times in UTC._

- **[HH:MM]** - Incident trigger (e.g., bad deploy, surge).
- **[HH:MM]** - Alert fired (`AlertName`).
- **[HH:MM]** - On-call engineer paged.
- **[HH:MM]** - Incident acknowledged.
- **[HH:MM]** - Mitigation started (e.g., rollback).
- **[HH:MM]** - Service recovered.
- **[HH:MM]** - Incident closed.

## 4. Root Cause Analysis (The "5 Whys")

1.  **Why did the service fail?**
    - [Answer]
2.  **Why?**
    - [Answer]
3.  **Why?**
    - [Answer]
4.  **Why?**
    - [Answer]
5.  **Why?**
    - [Answer]

**Root Cause:** [The fundamental issue]

## 5. Resolution & Recovery

_How was the issue fixed? Was it a temporary patch or permanent fix?_

## 6. Lessons Learned

### What went well?

- [Example: Alert triggered immediately.]
- [Example: Runbook was accurate.]

### What went wrong?

- [Example: Logs were missing X info.]
- [Example: Rollback took too long.]

### Where did we get lucky?

- [Example: Happened during low traffic.]

## 7. Action Items

| ID  | Action           | Owner | Priority | Ticket   |
| :-- | :--------------- | :---- | :------- | :------- |
| 1   | Fix the bug in X | @dev  | High     | JIRA-123 |
| 2   | Add alert for Y  | @ops  | Medium   | JIRA-124 |
| 3   | Update runbook Z | @sre  | Low      | JIRA-125 |

## 8. Evidence

_Link to snapshots, logs, and dashboards._

- Snapshot: `incidents/INC-XX_snapshot`
- Grafana Link: ...
