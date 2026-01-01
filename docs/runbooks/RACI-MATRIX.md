# Incident Response RACI Matrix

**Purpose**: Clearly define roles and responsibilities during incident response

**RACI Legend**:
- **R** = Responsible (does the work)
- **A** = Accountable (decision maker, only one per activity)
- **C** = Consulted (provides input)
- **I** = Informed (kept in the loop)

---

## Incident Lifecycle RACI

| Activity | Incident Commander (IC) | Technical Lead | On-Call Engineer | Scribe | Communications | SRE Lead | Eng Manager | VP Eng | Customer Support |
|----------|------------------------|----------------|------------------|--------|----------------|----------|-------------|--------|------------------|
| **Detect & Acknowledge Alert** | I | I | R/A | I | I | I | I | I | I |
| **Assess Severity** | R/A | C | C | I | I | C | I | I | I |
| **Declare Incident** | R/A | C | C | I | I | C | I | I | I |
| **Create Incident Channel** | R/A | I | I | R | I | I | I | I | I |
| **Assign Roles** | R/A | I | C | I | I | C | I | I | I |
| **Investigate Root Cause** | A | R | R | I | I | C | I | I | I |
| **Develop Mitigation Plan** | A | R | R | I | I | C | I | I | I |
| **Execute Mitigation** | A | R | R | I | I | C | I | I | I |
| **Internal Status Updates** | A | C | C | R | I | I | I | I | I |
| **External Status Updates** | A | I | I | C | R | I | C | I | C |
| **Customer Communications** | A | I | I | C | R | I | C | I | C |
| **Escalate to Leadership** | R/A | C | I | I | C | C | I | I | I |
| **Verify Resolution** | A | R | R | I | I | C | I | I | I |
| **Close Incident** | R/A | C | C | I | I | C | I | I | I |
| **Write Postmortem** | A | R | C | R | C | C | I | I | I |
| **Review Postmortem** | C | C | C | I | I | R/A | C | C | I |
| **Implement Action Items** | C | R | R | I | I | A | C | I | I |

---

## Role Definitions

### Incident Commander (IC)

**Primary Responsibility**: Orchestrate incident response, make decisions, coordinate teams

**Who**: Rotates among senior engineers/SREs on-call

**Key Activities**:
- Assess severity and declare incident
- Assign roles (Technical Lead, Scribe, Comms)
- Coordinate between teams
- Make go/no-go decisions (rollback, scale up, etc.)
- Ensure regular status updates
- Declare incident resolved
- Ensure postmortem is created

**Decision Authority**: Full authority to make technical decisions during incident

**Escalation Path**: SRE Lead → Eng Manager → VP Engineering

---

### Technical Lead

**Primary Responsibility**: Lead technical investigation and resolution

**Who**: Subject matter expert for affected system (auto-assigned or selected by IC)

**Key Activities**:
- Investigate root cause
- Develop mitigation plan
- Execute technical fixes (or delegate)
- Review logs, metrics, traces
- Propose rollback if needed
- Write technical sections of postmortem

**Decision Authority**: Proposes solutions; IC makes final call

**Escalation Path**: IC → SRE Lead → Staff Engineer/Principal Engineer

---

### On-Call Engineer

**Primary Responsibility**: First responder, initial investigation

**Who**: Engineer on PagerDuty rotation

**Key Activities**:
- Acknowledge alert within 5 minutes
- Perform initial triage
- Assess severity
- Page IC for SEV1/SEV2
- Assist Technical Lead with investigation
- Execute commands as directed

**Decision Authority**: Can take immediate action for clear issues (restart pod, rollback recent deploy)

**Escalation Path**: IC → Technical Lead

---

### Scribe

**Primary Responsibility**: Document timeline and decisions

**Who**: Assigned by IC (often junior engineer for learning opportunity)

**Key Activities**:
- Maintain real-time timeline in incident channel
- Document all decisions and actions
- Record timestamps for all events
- Take notes during incident calls
- Prepare timeline for postmortem
- Track action items

**Decision Authority**: None (observes and documents)

**Escalation Path**: IC

---

### Communications

**Primary Responsibility**: Stakeholder and customer communication

**Who**: Assigned by IC (often customer support lead or dedicated comms person)

**Key Activities**:
- Send initial status update (5 min for SEV1)
- Provide regular updates (15-30 min)
- Update status page
- Notify customers if needed
- Draft external communications
- Coordinate with Customer Support

**Decision Authority**: Message content (approved by IC)

**Escalation Path**: IC → Eng Manager → VP Engineering

---

### SRE Lead

**Primary Responsibility**: Oversight, escalation, resource allocation

**Who**: SRE team lead (paged for SEV1)

**Key Activities**:
- Monitor incident progress
- Provide guidance to IC/Technical Lead
- Allocate additional resources if needed
- Escalate to leadership if needed
- Review and approve postmortem
- Ensure action items are completed
- Track SLO impact

**Decision Authority**: Can override IC in extreme cases

**Escalation Path**: VP Engineering → CTO

---

### Engineering Manager

**Primary Responsibility**: Team coordination, leadership updates

**Who**: Manager of affected team (paged for SEV1, notified for SEV2)

**Key Activities**:
- Ensure team has resources needed
- Provide subject matter experts
- Update leadership
- Remove blockers
- Approve staffing for extended incidents
- Review postmortem
- Track action item completion

**Decision Authority**: Team resources, staffing decisions

**Escalation Path**: VP Engineering → CTO

---

### VP Engineering

**Primary Responsibility**: Executive oversight, customer escalation

**Who**: VP Engineering (paged only for SEV1 with major impact)

**Key Activities**:
- Monitor high-severity incidents
- Provide executive communication
- Authorize emergency measures (e.g., infrastructure spending)
- Customer escalation point
- Board/investor communication if needed

**Decision Authority**: Final authority on all decisions

**Escalation Path**: CTO → CEO

---

### Customer Support

**Primary Responsibility**: Customer interface, support ticket management

**Who**: Customer Support Lead

**Key Activities**:
- Monitor support tickets for incident reports
- Provide user impact data
- Route customer questions to Comms
- Prepare customer response templates
- Track customer-facing impact

**Decision Authority**: None (provides input)

**Escalation Path**: Comms → IC

---

## Severity-Based Role Assignment

### SEV1 (Complete Outage)

| Role | Who | Page/Notify | When |
|------|-----|-------------|------|
| IC | Senior SRE | Page | Immediately |
| Technical Lead | SME for affected system | Page | Immediately |
| On-Call | Current on-call engineer | Page | Immediately |
| Scribe | Available engineer | Assign | Within 5 min |
| Comms | Customer Support Lead | Page | Within 5 min |
| SRE Lead | SRE team lead | Page | Within 5 min |
| Eng Manager | Manager of affected team | Notify | Within 10 min |
| VP Engineering | VP Engineering | Notify | Within 15 min |

### SEV2 (Major Degradation)

| Role | Who | Page/Notify | When |
|------|-----|-------------|------|
| IC | Senior Engineer or SRE | Assign | Within 15 min |
| Technical Lead | SME for affected system | Assign | Within 15 min |
| On-Call | Current on-call engineer | Page | Immediately |
| Scribe | Available engineer | Assign | Within 15 min |
| Comms | Customer Support | Notify | Within 30 min |
| SRE Lead | SRE team lead | Notify | Within 30 min |
| Eng Manager | Manager of affected team | Notify | Within 30 min |

### SEV3 (Minor Issue)

| Role | Who | Page/Notify | When |
|------|-----|-------------|------|
| IC | On-call engineer (acts as IC) | — | — |
| Technical Lead | On-call engineer or SME | Assign | As needed |
| Scribe | Not required | — | — |
| Comms | Not required | — | — |

### SEV4 (Cosmetic)

| Role | Who | Page/Notify | When |
|------|-----|-------------|------|
| IC | Not required | — | — |
| Technical Lead | Engineer who found issue | — | — |

---

## Decision Authority Matrix

| Decision | IC | Technical Lead | SRE Lead | Eng Manager | VP Eng |
|----------|----|--------------|---------|-----------|----|
| Rollback deployment | **A** | R | C | I | I |
| Scale up infrastructure | **A** | R | C | I | I |
| Emergency code change | **A** | R | C | I | I |
| Disable feature | **A** | R | C | C | I |
| Failover to backup region | C | C | **A** | C | I |
| Emergency spend >$1k | C | I | C | **A** | I |
| Emergency spend >$10k | I | I | I | C | **A** |
| Declare incident | **A** | C | C | I | I |
| Escalate to SEV1 | **A** | C | C | I | I |
| Close incident | **A** | C | C | I | I |
| Customer communication | **A** | I | I | C | I |

**Legend**:
- **A** = Final decision authority
- R = Recommends
- C = Consulted
- I = Informed

---

## Escalation Paths

```
SEV4/SEV3 Incidents:
On-Call Engineer → Technical Lead → Eng Manager

SEV2 Incidents:
On-Call → IC → Technical Lead → SRE Lead → Eng Manager

SEV1 Incidents:
On-Call → IC → Technical Lead → SRE Lead → Eng Manager → VP Eng → CTO

Customer Escalations:
Customer Support → Comms → IC → Eng Manager → VP Eng

Technical Escalations:
On-Call → Technical Lead → Principal Engineer → SRE Lead

Budget Escalations:
IC → Eng Manager → VP Eng (>$10k) → CFO
```

---

## Contact Information

_Maintain up-to-date contact info for all roles_

| Role | Name | Slack | Phone | PagerDuty |
|------|------|-------|-------|-----------|
| SRE Lead | [Name] | @username | [###] | [Link] |
| Eng Manager (API) | [Name] | @username | [###] | [Link] |
| Eng Manager (Frontend) | [Name] | @username | [###] | [Link] |
| VP Engineering | [Name] | @username | [###] | [Link] |
| Customer Support Lead | [Name] | @username | [###] | — |
| On-Call (Current) | [Check PagerDuty] | — | — | [Link] |

**PagerDuty Schedules**: https://[your-org].pagerduty.com/schedules

---

## Handoff Procedures

### IC Handoff (for extended incidents)

**When**: After 4-6 hours or end of shift

**Process**:
1. Incoming IC reviews timeline in incident channel
2. Outgoing IC provides 5-minute verbal brief:
   - Current status
   - Root cause (known or suspected)
   - Mitigation in progress
   - Next steps
   - Open questions
3. Formal handoff in incident channel:
   ```
   Incident Commander handoff:
   From: @old-ic
   To: @new-ic
   Time: HH:MM UTC
   Status: [brief summary]
   ```
4. Outgoing IC remains available for 30 minutes

### Technical Lead Handoff

**When**: SME changes or shift change

**Process**:
1. Review of technical state
2. Share of relevant logs/metrics/traces
3. Document current hypothesis
4. Announce in incident channel

---

## Training & Preparedness

### Incident Commander Training

**Required for**:
- Senior Engineers
- All SREs
- Engineering Managers

**Topics**:
- Incident severity assessment
- Role assignment
- Decision-making under pressure
- Communication best practices
- Using incident tools (Slack, PagerDuty, Grafana)

**Frequency**: Quarterly drills

### On-Call Training

**Required for**:
- All engineers

**Topics**:
- Alert acknowledgement
- Initial triage
- Runbook navigation
- Escalation procedures
- Tool access (kubectl, psql, cypher-shell)

**Frequency**: Before first on-call shift + annual refresher

---

**Last Updated**: YYYY-MM-DD
**Next Review**: YYYY-MM-DD (quarterly)
**Owner**: SRE Lead
