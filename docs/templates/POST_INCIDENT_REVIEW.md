# Post-Incident Review (PIR)

**Incident ID:** [e.g., INC-2025-001]
**Date:** YYYY-MM-DD
**Severity:** [SEV0/SEV1/SEV2/SEV3]
**Status:** [Open/Closed]
**Authors:** [Names]

## Executive Summary

_Briefly describe what happened, the impact, and the root cause._

## Impact

- **Duration:** [Start Time] to [End Time] (Total: Xh Ym)
- **Affected Tenants:** [List or Count]
- **Data Impact:** [Data loss, exposure, or corruption details]
- **Financial Impact:** [Estimated cost/credits]

## Timeline

_All times in UTC._

| Time  | Event                    | Actor      |
| :---- | :----------------------- | :--------- |
| 00:00 | Incident Triggered       | System     |
| 00:05 | Alert Fired: `AlertName` | Monitoring |
| 00:15 | Acknowledged by On-Call  | [Name]     |
| 00:30 | Kill-Switch Activated    | [Name]     |
| 01:00 | Fix Deployed             | [Name]     |
| 01:15 | Recovery Confirmed       | [Name]     |

## Root Cause Analysis (5 Whys)

1.  **Why did the system fail?**
    - [Answer]
2.  **Why?**
    - [Answer]
3.  **Why?**
    - [Answer]
4.  **Why?**
    - [Answer]
5.  **Why?**
    - [Answer]

## Detection & Response

- **How was it detected?** [Alert/User Report]
- **Time to Detect (TTD):** X mins
- **Time to Mitigate (TTM):** Y mins
- **What went well?**
  - [Point 1]
- **What could be improved?**
  - [Point 1]

## Remediation & Guardrails (Prevent Recurrence)

- **Immediate Fix:** [Link to PR]
- **Long-term Fix:** [Link to Ticket]
- **New Guardrail:** [Describe new test/policy/alert]

## Action Items

| ID       | Action                    | Owner  | Due Date   | Status |
| :------- | :------------------------ | :----- | :--------- | :----- |
| TICKET-1 | Implement regression test | [Name] | YYYY-MM-DD | Open   |
| TICKET-2 | Update runbook            | [Name] | YYYY-MM-DD | Open   |
