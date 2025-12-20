# Incident Response Procedures

## Table of Contents
- [Overview](#overview)
- [Incident Classification](#incident-classification)
- [Response Team Structure](#response-team-structure)
- [Incident Lifecycle](#incident-lifecycle)
- [Communication Guidelines](#communication-guidelines)
- [Tools and Access](#tools-and-access)
- [Post-Incident Review](#post-incident-review)

## Overview

This document outlines the incident response procedures for the IntelGraph platform. All team members should be familiar with these procedures and follow them during production incidents.

### Goals
- **Minimize Impact**: Reduce the duration and scope of incidents
- **Maintain Communication**: Keep stakeholders informed throughout
- **Learn and Improve**: Document learnings and prevent recurrence
- **Meet SLOs**: Achieve 99.9% uptime and <5min MTTR targets

### Key Metrics
- **MTTR (Mean Time To Recovery)**: Target <5 minutes
- **MTTA (Mean Time To Acknowledge)**: Target <2 minutes
- **Availability**: Target 99.9% (43.8 minutes downtime/month)
- **Error Budget**: 0.1% per month

## Incident Classification

### Severity Levels

#### P0 - Critical
**Definition**: Complete service outage or critical functionality unavailable

**Examples**:
- API completely unreachable
- Database down, all operations failing
- Data breach or security incident
- Authentication system failure

**Response**:
- **Acknowledgment**: Immediate (within 2 minutes)
- **Response**: Immediate page to on-call
- **Updates**: Every 10 minutes
- **Escalation**: After 15 minutes if not resolved
- **Post-mortem**: Required within 24 hours

**Notifications**:
- PagerDuty page (phone + SMS)
- #alerts-critical Slack channel
- Status page update (major outage)
- Customer email if >15 minutes

#### P1 - High
**Definition**: Major degradation affecting >50% of users or critical functionality

**Examples**:
- High error rate (>1%)
- Significant latency increase (>2x normal)
- Major feature unavailable
- Database connection pool exhaustion

**Response**:
- **Acknowledgment**: Within 5 minutes
- **Response**: Page to on-call
- **Updates**: Every 15 minutes
- **Escalation**: After 30 minutes if not resolved
- **Post-mortem**: Required within 48 hours

**Notifications**:
- PagerDuty page (phone + SMS)
- #alerts-warning Slack channel
- Status page update (degraded performance)
- Customer email if >30 minutes

#### P2 - Medium
**Definition**: Partial degradation affecting <50% of users

**Examples**:
- Intermittent errors
- Slow response times for some endpoints
- Non-critical feature unavailable
- Minor data inconsistency

**Response**:
- **Acknowledgment**: Within 15 minutes
- **Response**: Slack notification to on-call
- **Updates**: Every 30 minutes
- **Escalation**: After 2 hours if not resolved
- **Post-mortem**: Optional, recommended

**Notifications**:
- #alerts-warning Slack channel
- Status page update if customer-facing
- No customer email unless prolonged

#### P3 - Low
**Definition**: Minor issue with minimal user impact

**Examples**:
- Non-customer-facing service degradation
- Monitoring alert for non-critical system
- Minor configuration issue
- Warning-level log volume increase

**Response**:
- **Acknowledgment**: Next business day
- **Response**: Create ticket, address during business hours
- **Updates**: As needed
- **Escalation**: Not typically required
- **Post-mortem**: Not required

**Notifications**:
- #monitoring Slack channel
- No status page update
- No customer notification

## Response Team Structure

### Roles

#### Incident Commander (IC)
**Primary Responsibility**: Overall incident coordination and decision-making

**Duties**:
- Assess severity and coordinate response
- Create incident Slack channel
- Delegate tasks to responders
- Make judgment calls on mitigation strategies
- Coordinate communications
- Decide when incident is resolved
- Schedule post-mortem

**Who**: Primary on-call engineer (default) or designated senior engineer

#### Technical Lead
**Primary Responsibility**: Technical investigation and resolution

**Duties**:
- Investigate root cause
- Implement fixes and mitigations
- Coordinate with other engineers
- Provide technical updates to IC
- Document actions taken

**Who**: On-call engineer or subject matter expert

#### Communications Lead
**Primary Responsibility**: Stakeholder communication

**Duties**:
- Update status page
- Post updates to Slack channels
- Draft customer communications
- Coordinate with Customer Success
- Maintain incident timeline

**Who**: Product Manager or designated team member (for P0/P1 incidents)

#### Observer/Scribe
**Primary Responsibility**: Documentation

**Duties**:
- Document timeline of events
- Record decisions and actions
- Capture screenshots and logs
- Take notes for post-mortem

**Who**: Available engineer not directly responding

## Incident Lifecycle

### 1. Detection (Target: <1 minute)

**Automated Detection**:
- Monitoring alerts (Prometheus, DataDog)
- Synthetic monitoring failures
- Error rate thresholds
- Customer-reported via support

**Manual Detection**:
- Team member observes issue
- Customer reports via Slack/email
- Social media mentions

### 2. Response (Target: <2 minutes)

**Immediate Actions**:
```bash
# 1. Acknowledge alert
pd incident ack <incident-id>

# 2. Join #incident-response channel
# Post: "Acknowledging <alert-name> - investigating"

# 3. Open monitoring dashboards
open https://grafana.intelgraph.com/d/production-health
open https://app.datadoghq.com/apm

# 4. Check recent changes
git log --oneline -10
helm history intelgraph -n intelgraph
```

### 3. Assessment (Target: <5 minutes)

**Key Questions**:
- What is the user-facing impact?
- How many users are affected?
- Is this a new issue or recurrence?
- What changed recently?

**Initial Assessment**:
```bash
# Check service health
curl -f https://api.intelgraph.com/health/detailed

# Check error rates
# View in Grafana: Error Rate panel

# Check recent deployments
kubectl get events -n intelgraph --sort-by='.lastTimestamp'

# Check database health
psql -h postgres -c "SELECT 1;"
cypher-shell -a bolt://neo4j:7687 "RETURN 1;"
redis-cli ping
```

**Classify Severity**:
- Review criteria above
- Classify as P0, P1, P2, or P3
- Adjust response accordingly

### 4. Mobilization (Target: <5 minutes for P0/P1)

**For P0/P1 Incidents**:
```
# Create incident channel
/incident create P0 "<brief description>"

# This creates: #incident-2024-01-15-api-down

# Assign roles
IC: @engineer-oncall
Tech Lead: @engineer-oncall
Comms: @product-manager
Scribe: @available-engineer
```

**Assemble Team**:
- Post in #incident-response
- Tag relevant team members
- Page additional engineers if needed

### 5. Investigation & Mitigation (Ongoing)

**Investigation Approach**:
1. **Gather Data**: Logs, metrics, traces
2. **Form Hypothesis**: What might be causing this?
3. **Test Hypothesis**: Check logs/metrics
4. **Implement Fix**: Deploy mitigation
5. **Verify**: Confirm metrics improving
6. **Iterate**: If not resolved, new hypothesis

**Common Mitigation Strategies**:

**Rollback Recent Changes**:
```bash
# Rollback Helm release
helm rollback intelgraph <previous-revision> -n intelgraph

# Rollback Kubernetes deployment
kubectl rollout undo deployment/intelgraph-api -n intelgraph
```

**Scale Resources**:
```bash
# Scale up replicas
kubectl scale deployment intelgraph-api -n intelgraph --replicas=10

# Enable HPA
kubectl autoscale deployment intelgraph-api -n intelgraph \
  --min=5 --max=20 --cpu-percent=70
```

**Restart Services**:
```bash
# Rolling restart
kubectl rollout restart deployment intelgraph-api -n intelgraph

# Wait for completion
kubectl rollout status deployment intelgraph-api -n intelgraph
```

**Enable Circuit Breaker**:
```bash
# Isolate failing dependency
kubectl patch configmap intelgraph-config -p '{"data":{"CIRCUIT_BREAKER_ENABLED":"true"}}'
kubectl rollout restart deployment intelgraph-api -n intelgraph
```

### 6. Communication (Ongoing)

**Update Frequency**:
- P0: Every 10 minutes
- P1: Every 15 minutes
- P2: Every 30 minutes

**Update Template**:
```
📊 UPDATE: <Incident Name> [HH:MM]

Status: <Investigating/Identified/Fixing/Monitoring/Resolved>
Impact: <brief description>
Root Cause: <if known>
Actions: <what we're doing>
ETA: <if known>
Next Update: <timestamp>
```

**Status Page Updates**:
- P0/P1: Update immediately
- Include: What, Impact, Status, ETA
- Update as status changes
- Post resolution update

### 7. Resolution (Target: <5 minutes MTTR)

**Verification Checklist**:
- [ ] Metrics returned to normal (error rate, latency)
- [ ] No active alerts
- [ ] Health checks passing
- [ ] Sample customer transactions successful
- [ ] Stable for 15+ minutes (P0/P1) or 5+ minutes (P2)

**Resolution Announcement**:
```
✅ RESOLVED: <Incident Name>

Duration: <X> minutes
Root Cause: <brief description>
Resolution: <what fixed it>
Follow-up: <any ongoing work or monitoring>

Service is now operating normally. Post-mortem will be conducted within <24/48> hours.

Thank you for your patience and support during this incident.
```

### 8. Post-Incident (Within 24-48 hours)

See [Post-Incident Review](#post-incident-review) section below.

## Communication Guidelines

### Internal Communication

**Slack Channels**:
- `#incident-response`: Primary incident coordination
- `#alerts-critical`: Critical alert notifications
- `#alerts-warning`: Warning alert notifications
- `#monitoring`: Info-level alerts and monitoring
- `#incident-YYYY-MM-DD-name`: Per-incident channel

**Communication Style**:
- Be clear and concise
- Use facts, not speculation
- Avoid jargon when possible
- State uncertainty when appropriate
- Focus on customer impact

**Examples**:
```
❌ Bad: "The database might be acting weird"
✅ Good: "PostgreSQL query latency increased 3x. Investigating connection pool."

❌ Bad: "We broke production"
✅ Good: "API error rate 5%. Rolling back recent deployment."
```

### External Communication

**Status Page**:
- Update within 5 minutes of P0/P1 incident
- Use clear, non-technical language
- Focus on customer impact
- Provide ETAs when confident
- Update regularly until resolved

**Status Page Components**:
- API
- Web Application
- Database
- Authentication
- Data Ingestion
- Graph Analysis

**Customer Email** (for prolonged P0/P1):
- Send after 15-30 minutes of downtime
- Use standard template (see runbooks)
- Acknowledge impact
- Provide updates
- Offer support contact

### Communication Escalation

**Notify Management**:
- P0: Immediately (Engineering Manager, VP Eng)
- P1: After 30 minutes if unresolved
- P2: If customer escalation or >2 hours

**Notify Legal/PR**:
- Data breach suspected
- Security incident
- Potential regulatory impact
- Media attention

## Tools and Access

### Monitoring & Observability
- **Grafana**: https://grafana.intelgraph.com
- **DataDog APM**: https://app.datadoghq.com/apm
- **Prometheus**: http://prometheus:9090
- **Jaeger**: https://jaeger.intelgraph.com

### Incident Management
- **PagerDuty**: https://intelgraph.pagerduty.com
- **Opsgenie**: https://intelgraph.app.opsgenie.com
- **Status Page**: https://status.intelgraph.com

### Infrastructure
- **Kubernetes Dashboard**: https://k8s.intelgraph.com
- **AWS Console**: https://console.aws.amazon.com
- **GitHub**: https://github.com/intelgraph/platform

### Documentation
- **Runbooks**: `/docs/runbooks/`
- **Architecture Docs**: `/docs/architecture/`
- **API Docs**: https://docs.intelgraph.com

### Access Requirements
- All on-call engineers must have:
  - PagerDuty mobile app installed
  - kubectl configured for production
  - AWS CLI configured
  - VPN access configured
  - Database access (read for all, write for senior+)
  - GitHub repository access

## Post-Incident Review

### Timeline

**P0**: Within 24 hours
**P1**: Within 48 hours
**P2**: Within 1 week (optional but recommended)
**P3**: Not required

### Post-Mortem Template

**1. Executive Summary**
- Brief description of incident
- Duration and impact
- Root cause (one sentence)
- Resolution summary

**2. Incident Details**
- **Start Time**: When first detected
- **End Time**: When fully resolved
- **Duration**: Total downtime
- **Severity**: P0/P1/P2/P3
- **Affected Services**: List impacted systems
- **Affected Customers**: Number/percentage

**3. Timeline** (detailed chronological order)
```
HH:MM - Event description
HH:MM - Action taken
HH:MM - Result observed
...
```

**4. Root Cause Analysis**
- **What happened**: Technical description
- **Why it happened**: Contributing factors
- **Why it wasn't caught**: Detection gaps

**5. Impact Assessment**
- **User Impact**: Number of affected users/requests
- **Business Impact**: Revenue, SLA breach, reputation
- **Data Impact**: Any data loss or corruption

**6. What Went Well**
- Quick detection
- Effective communication
- Good runbook usage
- Team collaboration

**7. What Went Poorly**
- Late detection
- Unclear runbook
- Communication gaps
- Technical issues

**8. Action Items**
| Action | Owner | Priority | Due Date | Status |
|--------|-------|----------|----------|--------|
| Add monitoring for X | @eng1 | P0 | 2024-01-20 | Open |
| Update runbook | @eng2 | P1 | 2024-01-25 | Open |
| Implement fix for Y | @eng3 | P1 | 2024-01-30 | Open |

**9. Lessons Learned**
- Technical learnings
- Process improvements
- Tool enhancements needed

### Post-Mortem Meeting

**Attendees**:
- Incident Commander
- Technical responders
- Engineering Manager
- Product Manager (if customer impact)

**Agenda**:
1. Walk through timeline (5-10 min)
2. Discuss root cause (5 min)
3. Review impact (5 min)
4. Identify action items (10 min)
5. Assign owners and due dates (5 min)

**Culture**:
- **Blameless**: Focus on systems, not people
- **Learning-focused**: What can we learn?
- **Action-oriented**: What will we do differently?
- **Open**: Encourage honesty and transparency

### Follow-up

**Action Item Tracking**:
- Create GitHub issues for each action item
- Tag with `post-incident` label
- Assign owners
- Set due dates
- Review in weekly engineering meeting

**Runbook Updates**:
- Update relevant runbooks with learnings
- Add new runbooks if gaps identified
- Share updates with team

**Knowledge Sharing**:
- Share post-mortem doc with engineering team
- Present major incidents in all-hands
- Add to incident archive

## Appendix

### Quick Reference

**Incident Severities**:
- P0: Complete outage → Page immediately → Update every 10min
- P1: Major degradation → Page → Update every 15min
- P2: Partial degradation → Slack → Update every 30min
- P3: Minor issue → Ticket → Business hours

**Key Metrics**:
- Availability SLO: 99.9%
- Latency SLO: <500ms p95
- Error Rate SLO: <1%
- MTTR Target: <5 minutes
- MTTA Target: <2 minutes

**Essential Commands**:
```bash
# Check service health
curl https://api.intelgraph.com/health/detailed

# View logs
kubectl logs -l app=intelgraph-api -n intelgraph --tail=100

# Rollback deployment
helm rollback intelgraph -n intelgraph

# Scale services
kubectl scale deployment intelgraph-api -n intelgraph --replicas=10

# Restart services
kubectl rollout restart deployment intelgraph-api -n intelgraph
```

### Contact Information

**Escalation**:
- Engineering Manager: [contact info]
- VP Engineering: [contact info]
- CTO: [contact info]

**External**:
- DataDog Support: support@datadoghq.com
- AWS Support: [account specific]
- PagerDuty Support: support@pagerduty.com

### Resources

- [Service Degradation Runbook](../runbooks/service-degradation.md)
- [Database Failure Recovery](../runbooks/database-failure-recovery.md)
- [API Rate Limit Exceeded](../runbooks/api-rate-limit-exceeded.md)
- [Security Incident Response](../runbooks/security-incident-response.md)
- [On-Call Guide](ON_CALL_GUIDE.md)
