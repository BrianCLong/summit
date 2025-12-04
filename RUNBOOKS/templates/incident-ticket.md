# Incident Ticket Template

**Copy this template when creating a new incident ticket in Jira/GitHub Issues**

---

## Incident Overview

**Incident ID**: INC-YYYYMMDD-### (auto-generated or sequential)
**Severity**: [SEV1 / SEV2 / SEV3 / SEV4]
**Status**: [Investigating / Mitigating / Resolved / Closed]
**Incident Commander**: @username
**Slack Channel**: #incident-YYYYMMDD-brief-description

---

## Impact

**Start Time**: YYYY-MM-DD HH:MM UTC
**End Time**: YYYY-MM-DD HH:MM UTC (if resolved)
**Duration**: X hours Y minutes (or "Ongoing")

**User Impact**:
- [ ] Complete outage (no users can access)
- [ ] Major degradation (>50% users affected)
- [ ] Partial degradation (10-50% users affected)
- [ ] Minor degradation (<10% users affected)

**Affected Services**:
- [ ] GraphQL API
- [ ] Web UI
- [ ] Copilot
- [ ] Entity Management
- [ ] Relationship Graph
- [ ] Authentication
- [ ] Other: __________

**Business Impact**:
- [ ] Revenue loss (estimated $________)
- [ ] Data loss risk
- [ ] SLO violation (error budget consumed: ___%)
- [ ] Regulatory/compliance risk
- [ ] Reputation risk

---

## Alert Details

**Alert Name**: [e.g., GraphQLHighLatency]
**Alert Fired**: YYYY-MM-DD HH:MM UTC
**Alert Resolved**: YYYY-MM-DD HH:MM UTC (if applicable)

**Metrics at Time of Alert**:
```
Latency (p95): ___ ms
Error Rate: ___%
Request Rate: ___ req/s
```

**Alert Link**: [Alertmanager URL]
**Dashboard Link**: [Grafana URL]

---

## Timeline

| Time (UTC) | Event | Actor |
|------------|-------|-------|
| HH:MM | Alert fired | System |
| HH:MM | Incident acknowledged | @username |
| HH:MM | Investigation started | @username |
| HH:MM | Root cause identified | @username |
| HH:MM | Mitigation started | @username |
| HH:MM | Service restored | @username |
| HH:MM | Incident resolved | @username |

**Add rows as needed throughout the incident**

---

## Root Cause (Preliminary)

**Initial Hypothesis**:
[What do we think caused this?]

**Confirmed Root Cause** (update after investigation):
[What actually caused this?]

**Contributing Factors**:
- [Factor 1]
- [Factor 2]

---

## Mitigation Actions Taken

1. [Action 1 with timestamp]
2. [Action 2 with timestamp]
3. [Action 3 with timestamp]

**Rollback Performed**: [Yes / No]
**Rollback Command**:
```bash
[Command used if rollback performed]
```

---

## Resolution

**Resolution Summary**:
[Brief description of how the incident was resolved]

**Verification Steps Completed**:
- [ ] Metrics returned to normal
- [ ] Manual testing passed
- [ ] Smoke tests passed
- [ ] No new errors for 30+ minutes

**Residual Issues**:
- [Any remaining issues or degradation]

---

## Communication Log

| Time (UTC) | Audience | Message | Channel |
|------------|----------|---------|---------|
| HH:MM | Internal | Initial alert | #incident-channel |
| HH:MM | Stakeholders | Status update | #status-updates |
| HH:MM | Customers | Incident notification | Status page |
| HH:MM | All | Resolution | Email + Slack |

**Templates Used**:
- [ ] Initial status update
- [ ] Progress update(s)
- [ ] Resolution notification

---

## Action Items

**Immediate** (complete within 24h):
- [ ] [Action item 1] - @owner
- [ ] [Action item 2] - @owner

**Short-term** (complete within 1 week):
- [ ] [Action item 3] - @owner
- [ ] [Action item 4] - @owner

**Long-term** (complete within 1 month):
- [ ] [Action item 5] - @owner
- [ ] [Action item 6] - @owner

---

## Postmortem

**Postmortem Doc**: [Link to postmortem (required for SEV1/SEV2)]
**Postmortem Meeting**: [Calendar invite link]
**Postmortem Due Date**: [72 hours after resolution for SEV1/2]

---

## Related Issues/Incidents

- Related incident: [INC-YYYYMMDD-###]
- Related bug: [JIRA-###]
- Related alert: [Alert name]

---

## Metrics & Logs

**Key Queries**:
```promql
# Error rate
(sum(rate(graphql_requests_total{status="error"}[5m])) / sum(rate(graphql_requests_total[5m]))) * 100

# Latency
histogram_quantile(0.95, sum(rate(graphql_query_duration_ms_bucket[5m])) by (le))
```

**Log Snippets** (attach full logs separately):
```
[Relevant log lines showing errors]
```

**Trace IDs**: [Jaeger trace IDs for failed requests]

---

## Lessons Learned (Brief)

**What went well**:
- [Positive observation 1]
- [Positive observation 2]

**What went poorly**:
- [Issue 1]
- [Issue 2]

**What we'll do differently**:
- [Improvement 1]
- [Improvement 2]

**Full details in postmortem doc**

---

## Sign-off

**Incident Commander**: @username (signed at HH:MM UTC)
**Technical Lead**: @username (signed at HH:MM UTC)
**SRE Lead**: @username (signed at HH:MM UTC)

**Incident Status**: [Resolved / Closed]
**Postmortem Completed**: [Yes / No / Scheduled]

---

**Last Updated**: YYYY-MM-DD HH:MM UTC by @username
