# Ownership & Accountability Patterns

> **Version:** 1.0.0
> **Last Updated:** 2025-12-07
> **Status:** Active
> **Owner:** Platform Engineering

This document defines how service ownership is assigned, displayed, tracked, and transferred within CompanyOS. Clear ownership eliminates "who owns this?" questions and ensures accountability.

---

## Table of Contents

1. [Ownership Philosophy](#ownership-philosophy)
2. [Ownership Roles](#ownership-roles)
3. [Assignment Rules](#assignment-rules)
4. [SLO & Incident Accountability](#slo--incident-accountability)
5. [Error Budget Management](#error-budget-management)
6. [Orphaned Services](#orphaned-services)
7. [Ownership Transfers](#ownership-transfers)
8. [Governance & Enforcement](#governance--enforcement)

---

## Ownership Philosophy

### Core Principles

1. **Every service has ONE primary owner** - No ambiguity about who is accountable
2. **Ownership = Accountability** - Owners are responsible for reliability, security, and evolution
3. **Capabilities have business owners** - Business capabilities roll up to product/domain owners
4. **Ownership is visible** - Anyone can find the owner in < 30 seconds
5. **Ownership transitions are explicit** - No silent handoffs or assumptions

### What Ownership Means

| Aspect | Owner Responsibility |
|--------|---------------------|
| **Reliability** | Meet SLOs, respond to incidents, maintain error budget |
| **Security** | Address vulnerabilities, maintain compliance, review access |
| **Documentation** | Keep docs current, maintain runbooks, update catalog |
| **Evolution** | Plan deprecation, coordinate with consumers, drive improvements |
| **Dependencies** | Communicate breaking changes, maintain contracts |
| **On-Call** | Staff rotation, respond within SLA, participate in incidents |

### What Ownership Does NOT Mean

- Exclusive contribution rights (others can contribute)
- Sole decision-making (architecture review still applies)
- Permanent assignment (ownership can transfer)
- Blame assignment (blameless culture applies)

---

## Ownership Roles

### Primary Owner

The team or individual ultimately accountable for the service.

```yaml
PrimaryOwner:
  responsibilities:
    - Define and maintain service SLOs
    - Ensure on-call coverage
    - Respond to incidents as Incident Commander
    - Approve major changes and deprecation
    - Maintain documentation and runbooks
    - Track and manage error budget

  requirements:
    - Must have engineering capacity to maintain service
    - Must staff on-call rotation (for tier: critical, high)
    - Must respond to incidents within defined SLA
    - Must participate in ownership reviews quarterly

  privileges:
    - Final say on service roadmap
    - Approve/reject PRs (required reviewer)
    - Access to production environments
    - Control over feature flags and rollouts
```

### Backup Owner

Secondary team that can assume responsibility when primary is unavailable.

```yaml
BackupOwner:
  responsibilities:
    - Serve as escalation path
    - Provide coverage during primary owner PTO/unavailability
    - Participate in incident response as secondary
    - Stay informed of major changes

  requirements:
    - Familiarity with service architecture
    - Access to documentation and runbooks
    - Included in service-specific channels
    - At least one team member trained on service

  activation:
    - Primary owner explicitly hands off
    - Primary owner unreachable after 15 minutes
    - Incident escalation exceeds primary owner capacity
```

### Escalation Owner

Management or senior leadership for critical escalations.

```yaml
EscalationOwner:
  responsibilities:
    - Make business decisions during incidents
    - Authorize emergency changes
    - Coordinate cross-team dependencies
    - Approve ownership transfers

  requirements:
    - Director level or above
    - Authority to make resource allocation decisions
    - Understanding of business impact

  activation:
    - Incident severity: critical
    - Error budget exhausted
    - Ownership disputes
    - Cross-domain incidents
```

### Capability Owner

Business owner accountable for a capability across multiple services.

```yaml
CapabilityOwner:
  responsibilities:
    - Define capability roadmap
    - Ensure capability SLOs are met (aggregate)
    - Coordinate across implementing services
    - Represent capability in architecture reviews

  requirements:
    - Product Manager or Technical Product Manager
    - Understanding of all implementing services
    - Authority to prioritize capability work

  relationship:
    - Does NOT override service-level technical decisions
    - Provides business context and priorities
    - Escalation path for cross-service issues
```

---

## Assignment Rules

### New Service Ownership

```
┌─────────────────────────────────────────────────────────────────┐
│                   NEW SERVICE OWNERSHIP FLOW                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│   │   Service   │────▶│  Architecture│────▶│   Owner     │       │
│   │   Created   │     │   Review    │     │  Assigned   │       │
│   └─────────────┘     └─────────────┘     └─────────────┘       │
│         │                    │                   │               │
│         ▼                    ▼                   ▼               │
│   - Creator proposes    - Review owner     - Add to catalog     │
│     primary owner         suitability      - Configure alerts   │
│   - Must be existing    - Verify capacity  - Set up on-call     │
│     team with capacity  - Confirm backup   - Update CODEOWNERS  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Ownership Assignment Criteria

1. **Domain Alignment**: Owner should work in the service's domain
2. **Capacity Verification**: Owner must have bandwidth for:
   - On-call rotation (if tier critical/high)
   - Incident response
   - Maintenance and improvements
3. **Technical Competency**: Owner should have relevant skills
4. **Backup Coverage**: Backup owner must be identified

### Mandatory Ownership Fields

Every service in the catalog MUST have:

```yaml
ownership:
  primary_owner: string         # Required - team ID
  backup_owner: string          # Required - team ID
  escalation_owner: string      # Required for tier: critical
  oncall_schedule: string       # Required for tier: critical, high

  contacts:
    slack_channel: string       # Required
    email: string               # Required
    pagerduty_service: string   # Required for tier: critical, high

  last_ownership_review: date   # Required - must be < 90 days old
```

---

## SLO & Incident Accountability

### SLO Attribution

Service-level SLOs roll up to owners:

```
┌─────────────────────────────────────────────────────────────────┐
│                      SLO ATTRIBUTION FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Service SLO                                                     │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────┐                                                │
│  │   Service   │ ──────▶ Primary Owner Dashboard                │
│  │  SLO: 99.9% │                                                │
│  └─────────────┘                                                │
│       │                                                          │
│       ├──▶ Contributing Dependency SLOs                         │
│       │         │                                                │
│       │         ▼                                                │
│       │    If dependency violates SLO:                          │
│       │    - Source owner reports issue                         │
│       │    - Dependency owner investigates                      │
│       │    - Attribution tracked in incident                    │
│       │                                                          │
│       └──▶ Capability Aggregate SLO                             │
│                 │                                                │
│                 ▼                                                │
│            Capability Owner Dashboard                            │
│            (Weighted aggregate of all implementing services)     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Incident Ownership

| Incident Aspect | Responsible Party |
|-----------------|-------------------|
| **Detection** | On-call engineer (any team) |
| **Initial Response** | Service primary owner |
| **Incident Commander** | Primary owner lead or delegate |
| **Communication** | IC (internal), Comms lead (external) |
| **Resolution** | Primary owner + involved teams |
| **Postmortem** | Primary owner facilitates |
| **Action Items** | Assigned to relevant owners |

### Incident Escalation Path

```yaml
escalation_matrix:
  - level: 1
    contact: on-call engineer
    sla_minutes: 5
    action: Acknowledge and begin investigation

  - level: 2
    contact: primary owner lead
    sla_minutes: 15
    action: Join incident, assume IC role if needed

  - level: 3
    contact: backup owner lead
    sla_minutes: 30
    action: Provide additional capacity

  - level: 4
    contact: escalation owner (director+)
    sla_minutes: 60
    action: Make business decisions, allocate resources

  - level: 5
    contact: executive on-call
    sla_minutes: 120
    action: Customer communication, critical decisions
```

---

## Error Budget Management

### Error Budget Ownership

Each service's error budget is owned by the primary owner:

```yaml
error_budget:
  owner: platform-engineering    # Primary owner

  budget:
    monthly_minutes: 43.2       # For 99.9% availability (30 days)
    current_remaining: 38.5     # Minutes remaining
    burn_rate: 0.8x             # Current burn rate vs expected

  thresholds:
    green: 75-100               # >75% remaining - normal operations
    yellow: 50-75               # 50-75% remaining - increased caution
    orange: 25-50               # 25-50% remaining - freeze non-critical changes
    red: 0-25                   # <25% remaining - incident mode

  notifications:
    - threshold: 50
      recipients: [primary-owner, backup-owner]
      channel: slack
    - threshold: 25
      recipients: [primary-owner, escalation-owner]
      channel: pagerduty
```

### Error Budget Policies

| Budget Status | Policy |
|--------------|--------|
| **Green (>75%)** | Normal development, deployments allowed |
| **Yellow (50-75%)** | Extra review on changes, limit experiments |
| **Orange (25-50%)** | Freeze non-critical changes, focus on reliability |
| **Red (<25%)** | Emergency mode, reliability-only changes |
| **Exhausted (0%)** | All changes require escalation owner approval |

### Budget Burn Attribution

When error budget is consumed:

1. **Root cause identified** → Attributed to causing team
2. **Dependency failure** → Attributed to dependency owner
3. **Platform issue** → Attributed to platform team
4. **External factors** → No attribution (acts of god)

---

## Orphaned Services

### Definition

A service is considered **orphaned** when:

- Primary owner team no longer exists
- Primary owner explicitly abandons ownership
- Owner hasn't engaged in 90+ days (no reviews, PRs, incident response)
- Ownership contact information is invalid

### Detection Mechanisms

```yaml
orphan_detection:
  automated_checks:
    - name: ownership_staleness
      condition: last_ownership_review > 90 days
      action: alert primary owner, then escalation owner

    - name: no_recent_activity
      condition: no PRs, reviews, or incident responses in 90 days
      action: survey owner for continued ownership intent

    - name: team_dissolution
      condition: owner team removed from org graph
      action: immediate escalation to org leadership

    - name: contact_bounce
      condition: email/slack unreachable
      action: alert backup owner, then escalation owner

  manual_triggers:
    - owner explicitly requests transfer
    - owner leaves company without handoff
    - architecture review identifies gap
```

### Orphan Resolution Process

```
┌─────────────────────────────────────────────────────────────────┐
│                   ORPHAN RESOLUTION PROCESS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Day 0: Service flagged as potentially orphaned                 │
│         ↓                                                        │
│  Day 1-7: Contact primary owner for clarification               │
│         ↓                                                        │
│  Day 8-14: If unresponsive, contact backup owner                │
│         ↓                                                        │
│  Day 15-21: Escalate to domain leadership                       │
│         ↓                                                        │
│  Day 22-30: Architecture board assigns temporary owner          │
│         ↓                                                        │
│  Day 31+: Permanent ownership assigned or deprecation begins    │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  OUTCOMES:                                                       │
│  A) New permanent owner identified and accepts                  │
│  B) Service deprecated (if no business need)                    │
│  C) Service merged into another service                         │
│  D) Service assigned to platform team as "legacy maintenance"   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Temporary Ownership

When a service is orphaned, platform team provides temporary stewardship:

```yaml
temporary_ownership:
  scope:
    - Security patches and CVE remediation
    - Critical bug fixes affecting other services
    - Compliance-required updates
    - Minimal maintenance to keep service operational

  exclusions:
    - New feature development
    - Performance optimization
    - Technical debt reduction
    - Major refactoring

  duration:
    max_days: 90
    review_frequency: 30 days
    extension: requires VP approval
```

---

## Ownership Transfers

### When to Transfer

- Team restructuring or reorg
- Service moves to different domain
- Current owner lacks capacity
- Strategic reallocation
- Owner request (burnout, skillset mismatch)

### Transfer Process

```
┌─────────────────────────────────────────────────────────────────┐
│                  OWNERSHIP TRANSFER PROCESS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PHASE 1: INITIATION (Week 1)                                   │
│  ├─ Transfer request submitted                                  │
│  ├─ New owner identified and agrees                            │
│  ├─ Architecture review scheduled                               │
│  └─ Transfer timeline established                               │
│                                                                  │
│  PHASE 2: KNOWLEDGE TRANSFER (Week 2-3)                         │
│  ├─ Documentation review and updates                           │
│  ├─ Architecture walkthrough                                    │
│  ├─ Runbook training                                           │
│  ├─ On-call shadowing (at least 2 rotations)                   │
│  └─ Access provisioning for new owner                          │
│                                                                  │
│  PHASE 3: TRANSITION (Week 4)                                   │
│  ├─ New owner added as co-owner                                │
│  ├─ New owner leads incident (with old owner backup)           │
│  ├─ Old owner begins stepping back                             │
│  └─ Catalog and CODEOWNERS updated                             │
│                                                                  │
│  PHASE 4: COMPLETION (Week 5-6)                                 │
│  ├─ Old owner removed as primary                               │
│  ├─ Old owner available for questions (30 days)                │
│  ├─ Transfer retrospective conducted                           │
│  └─ All systems reflect new ownership                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Transfer Checklist

```markdown
## Pre-Transfer
- [ ] New owner identified and capacity confirmed
- [ ] Architecture review completed
- [ ] Transfer timeline agreed by all parties
- [ ] Escalation owner approves transfer

## Knowledge Transfer
- [ ] Documentation reviewed and updated
- [ ] Architecture walkthrough completed
- [ ] Key decision history shared
- [ ] Known issues and tech debt documented
- [ ] Runbooks validated by new owner
- [ ] On-call shadowing completed (minimum 2 incidents or 2 weeks)

## Technical Access
- [ ] Repository access granted
- [ ] Production environment access granted
- [ ] Monitoring dashboards shared
- [ ] Alert routing updated
- [ ] PagerDuty schedule updated
- [ ] Secrets/credentials rotated (if required)

## Documentation Updates
- [ ] Service catalog updated
- [ ] CODEOWNERS file updated
- [ ] README ownership section updated
- [ ] Runbook contacts updated
- [ ] Architecture diagrams updated (if ownership affects design)

## Validation
- [ ] New owner successfully handles incident (or drill)
- [ ] New owner deploys change successfully
- [ ] Old owner confirms knowledge transfer complete
- [ ] 30-day support period scheduled

## Completion
- [ ] Transfer retrospective conducted
- [ ] Lessons learned documented
- [ ] Announcement to stakeholders
```

### Emergency Transfers

For urgent transfers (e.g., owner leaves suddenly):

```yaml
emergency_transfer:
  trigger:
    - Owner leaves company without notice
    - Owner team dissolved immediately
    - Critical security incident requires different ownership

  process:
    - Escalation owner assumes temporary ownership
    - Platform team provides immediate support
    - Accelerated transfer (2 weeks instead of 6)
    - Post-transfer review mandatory

  safeguards:
    - All production access reviewed
    - Secrets rotated immediately
    - Access audit conducted
```

---

## Governance & Enforcement

### Ownership Audits

Quarterly ownership reviews ensure data quality:

```yaml
quarterly_audit:
  scope:
    - All services in production
    - All capabilities with >1 implementing service
    - All tier: critical and high services

  checks:
    - Contact information valid (email, Slack, PagerDuty)
    - On-call rotation staffed
    - Last incident response < 90 days (or drill conducted)
    - Documentation last updated < 180 days
    - SLO dashboard accessible and current

  outcomes:
    - Green: All checks pass
    - Yellow: Minor issues, 30 days to remediate
    - Red: Critical issues, immediate escalation
```

### Enforcement Mechanisms

| Violation | Consequence |
|-----------|-------------|
| Missing primary owner | Service blocked from production deployment |
| Invalid contacts | Weekly escalation until resolved |
| Stale ownership (>90 days) | Flagged as potentially orphaned |
| No on-call (tier critical/high) | Escalation owner notified, service tier downgraded |
| Failed audit | Remediation plan required within 14 days |

### CODEOWNERS Integration

GitHub CODEOWNERS file synchronized with catalog:

```bash
# Auto-generated from Service Catalog - DO NOT EDIT MANUALLY
# Last updated: 2025-12-07

# Critical Services
/services/graph-core/          @platform-engineering
/services/authz-gateway/       @security-engineering
/services/prov-ledger/         @data-engineering

# High Tier Services
/services/api-gateway/         @platform-engineering
/services/conductor/           @orchestration-team

# Package Ownership
/packages/authority-compiler/  @security-engineering
/packages/prov-ledger-sdk/     @data-engineering
```

### Metrics & Reporting

Track ownership health:

```yaml
ownership_metrics:
  - name: ownership_coverage
    description: Percentage of services with valid primary owner
    target: 100%

  - name: contact_validity
    description: Percentage of owners with valid contact info
    target: 100%

  - name: audit_compliance
    description: Percentage of services passing quarterly audit
    target: 95%

  - name: orphan_count
    description: Number of orphaned services
    target: 0

  - name: transfer_duration
    description: Average days to complete ownership transfer
    target: < 42 days

  - name: incident_response_coverage
    description: Percentage of incidents with owner response within SLA
    target: 99%
```

---

## Quick Reference

### Finding an Owner

1. **Service Catalog UI**: Search by service name → Owner tab
2. **CLI**: `summit catalog owner <service-id>`
3. **Slack**: `/summit owner graph-core`
4. **CODEOWNERS**: Check file in repository root
5. **PagerDuty**: Search service name for on-call

### Reporting Ownership Issues

1. **Slack**: `#service-catalog-support`
2. **Jira**: Create ticket with label `ownership-issue`
3. **CLI**: `summit catalog report-issue <service-id>`

### Ownership Role Summary

| Role | Count per Service | Responsibility |
|------|-------------------|----------------|
| Primary Owner | Exactly 1 | Full accountability |
| Backup Owner | Exactly 1 | Coverage and escalation |
| Escalation Owner | 1 (for critical) | Business decisions |
| On-Call | 1+ engineers | Incident response |

---

## Related Documents

- [SERVICE_CATALOG_DATA_MODEL.md](./SERVICE_CATALOG_DATA_MODEL.md) - Data model schema
- [SERVICE_CATALOG_V0.md](./SERVICE_CATALOG_V0.md) - Catalog overview
- [CATALOG_READY_CHECKLIST.md](./CATALOG_READY_CHECKLIST.md) - Readiness criteria
- [INCIDENT_MANAGEMENT.md](/runbooks/INCIDENT_MANAGEMENT.md) - Incident procedures
