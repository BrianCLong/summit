# Postmortem Template

> **Template Version**: 0.1.0
> **Last Updated**: 2025-12-06

This template is for blameless postmortems. Copy and complete within 48 hours of P1/P2 incidents.

---

## Postmortem: [INCIDENT TITLE]

### Incident Metadata

| Field | Value |
|-------|-------|
| **Incident ID** | INC-XXXX |
| **Date** | YYYY-MM-DD |
| **Duration** | X hours Y minutes |
| **Severity** | P1 / P2 / P3 |
| **Services Affected** | [list] |
| **Author** | [name] |
| **Status** | Draft / In Review / Final |

---

## Executive Summary

[2-3 sentence summary of what happened, impact, and resolution]

---

## Impact

### User Impact

| Metric | Value |
|--------|-------|
| Users Affected | X |
| Requests Failed | X |
| Error Rate Peak | X% |
| Revenue Impact | $X (if applicable) |

### SLO Impact

| SLO | Target | Actual During Incident | Budget Consumed |
|-----|--------|------------------------|-----------------|
| Availability | 99.9% | X% | X% of monthly budget |
| Latency p95 | 500ms | Xms | N/A |

### Business Impact
- [Impact 1]
- [Impact 2]

---

## Timeline

All times in UTC.

| Time | Event |
|------|-------|
| HH:MM | [Detection] Alert fired for [condition] |
| HH:MM | [Triage] On-call acknowledged, began investigation |
| HH:MM | [Diagnosis] Identified [root cause] |
| HH:MM | [Mitigation] Applied [fix] |
| HH:MM | [Recovery] Service restored to normal operation |
| HH:MM | [Resolution] Confirmed all metrics within SLO |

---

## Root Cause

### What Happened
[Detailed explanation of the technical failure]

### Why It Happened
[Deeper analysis - use 5 Whys or similar technique]

1. **Why did the service fail?** [Answer]
2. **Why did [Answer 1] occur?** [Answer]
3. **Why did [Answer 2] occur?** [Answer]
4. **Why did [Answer 3] occur?** [Answer]
5. **Why did [Answer 4] occur?** [Root cause]

### Contributing Factors
- [Factor 1]
- [Factor 2]
- [Factor 3]

---

## Detection

### How Was It Detected?
- [ ] Automated alert
- [ ] Customer report
- [ ] Internal user report
- [ ] Synthetic monitoring
- [ ] Manual discovery

### Detection Gap Analysis

| Question | Answer |
|----------|--------|
| Time to detect | X minutes |
| Should we have detected sooner? | Yes / No |
| What would have detected it sooner? | [Answer] |
| Were existing alerts effective? | Yes / No / Partially |

---

## Response

### What Went Well
- [Thing that worked]
- [Thing that worked]
- [Thing that worked]

### What Could Be Improved
- [Thing that could be better]
- [Thing that could be better]
- [Thing that could be better]

### Lucky Factors
[Things that could have made this worse but didn't]

---

## Action Items

### Immediate (This Week)

| Action | Owner | Due Date | Status | Tracking |
|--------|-------|----------|--------|----------|
| [Action] | @owner | YYYY-MM-DD | Open | [Link] |

### Short-term (This Month)

| Action | Owner | Due Date | Status | Tracking |
|--------|-------|----------|--------|----------|
| [Action] | @owner | YYYY-MM-DD | Open | [Link] |

### Long-term (This Quarter)

| Action | Owner | Due Date | Status | Tracking |
|--------|-------|----------|--------|----------|
| [Action] | @owner | YYYY-MM-DD | Open | [Link] |

### Action Item Categories

- [ ] **Detection**: Improve alerting/monitoring
- [ ] **Prevention**: Fix root cause
- [ ] **Mitigation**: Reduce impact if it happens again
- [ ] **Process**: Improve runbooks/procedures
- [ ] **Training**: Knowledge sharing

---

## Lessons Learned

### Technical Lessons
1. [Lesson]
2. [Lesson]

### Process Lessons
1. [Lesson]
2. [Lesson]

### What Should We Stop Doing?
- [Practice to stop]

### What Should We Start Doing?
- [Practice to start]

### What Should We Continue Doing?
- [Practice that worked well]

---

## Appendix

### Evidence Collected

| Type | Location | Description |
|------|----------|-------------|
| Logs | [link] | Application logs during incident |
| Metrics | [link] | Grafana dashboard snapshot |
| Traces | [link] | Jaeger traces for failed requests |
| Events | [link] | Kubernetes events |

### Related Incidents
- [INC-XXXX] - [Description if related]

### References
- [Runbook used](./runbooks/SERVICE.md)
- [Architecture diagram](./architecture/SERVICE.md)
- [SLO definition](./slo-definitions.md)

---

## Postmortem Meeting Notes

**Date**: YYYY-MM-DD
**Attendees**: [list]

### Discussion Points
- [Point discussed]
- [Point discussed]

### Decisions Made
- [Decision]
- [Decision]

### Follow-up Actions
- [Action assigned during meeting]

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Incident Commander | | |
| Service Owner | | |
| Engineering Manager | | |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | YYYY-MM-DD | [Author] | Initial postmortem |

---

*Postmortems are blameless. Focus on systems and processes, not individuals.*
