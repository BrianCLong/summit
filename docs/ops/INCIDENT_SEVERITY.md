# Incident Severity Rubric (SEV0–SEV3)

Use this rubric to quickly classify incidents, set response expectations, and align communications. Escalate when in doubt.

## Severity Matrix

| Level                        | Definition                                                                                           | Impact Scope                                      | Response Lead                              | Target Response                                                       | Communications                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **SEV0 — Critical Outage**   | Platform-wide or safety-impacting failure; data loss or corruption; regulatory breach in progress.   | Majority of tenants or regulated workloads.       | Incident Commander with Executive On-Call. | Acknowledgment ≤ 5 minutes, mitigation ≤ 30 minutes.                  | All-channels broadcast; exec + legal paging; status every 15 minutes. |
| **SEV1 — Major Degradation** | Material loss of functionality, elevated error rates, or prolonged latency with no safe workaround.  | Multiple regions/tenants or any regulated tenant. | Incident Commander with Domain Lead.       | Acknowledgment ≤ 15 minutes, mitigation ≤ 60 minutes.                 | Broad internal broadcast; stakeholders every 30 minutes.              |
| **SEV2 — Partial Impact**    | Feature-level outage, isolated region impact, or degraded experience with a documented workaround.   | Single region/service or limited tenant subset.   | Domain Lead.                               | Acknowledgment ≤ 30 minutes, mitigation ≤ 4 hours.                    | Targeted stakeholders; updates every 60 minutes.                      |
| **SEV3 — Minor / Watch**     | Intermittent issues, noisy alerts, cosmetic defects, or early detection with no customer impact yet. | Limited scope; no SLA breach.                     | Duty Engineer.                             | Acknowledgment ≤ 4 hours, mitigation best effort within business day. | As-needed updates in owning channel.                                  |

## Escalation Triggers

- Elevate to **SEV0** when safety, legal, or data integrity is threatened.
- Elevate to **SEV1** if impact crosses tenants/regions, or if workaround is unreliable.
- De-escalate only after sustained stability and stakeholder confirmation.

## Resolution Criteria (Definition of Done)

- Impact fully mitigated or contained.
- Customer communications sent (as applicable) and action items recorded.
- Post-incident review scheduled, owner assigned, and follow-up tasks captured in the tracker.
