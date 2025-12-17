# CompanyOS Operating Rhythm v0

> **Version**: 0.1.0
> **Last Updated**: 2025-12-07
> **Status**: Active
> **Owner**: Platform Engineering

---

## Overview

This document defines the operating rhythm for CompanyOS - the cadences, responsibilities, and artifacts that drive evidence-based decision-making across the organization.

**Guiding Principle**: *"Evidence or it didn't happen."* Every meeting should start with data, and every decision should be traceable to metrics.

---

## Operating Rhythm Calendar

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          COMPANYOS OPERATING RHYTHM                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DAILY          WEEKLY           BI-WEEKLY        MONTHLY        QUARTERLY   │
│  ─────          ──────           ─────────        ───────        ─────────   │
│                                                                              │
│  ┌──────┐      ┌──────────┐     ┌──────────┐    ┌──────────┐   ┌──────────┐ │
│  │Standup│      │Ops Review│     │Sprint    │    │Exec      │   │QBR       │ │
│  │(15m)  │      │(30m)     │     │Review    │    │Review    │   │(4hr)     │ │
│  └──────┘      └──────────┘     │(1hr)     │    │(1hr)     │   └──────────┘ │
│                                 └──────────┘    └──────────┘                │
│  ┌──────┐      ┌──────────┐                     ┌──────────┐   ┌──────────┐ │
│  │Health │      │Security  │                     │FinOps    │   │Planning  │ │
│  │Check  │      │Standup   │                     │Review    │   │(2 days)  │ │
│  │(auto) │      │(30m)     │                     │(45m)     │   └──────────┘ │
│  └──────┘      └──────────┘                     └──────────┘                │
│                                                                              │
│               ┌──────────┐                      ┌──────────┐                 │
│               │Product   │                      │Board     │                 │
│               │Metrics   │                      │Pack Prep │                 │
│               │(30m)     │                      │(2hr)     │                 │
│               └──────────┘                      └──────────┘                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Daily Cadences

### 1. Automated Health Check (Continuous)

**Purpose**: Continuous platform health monitoring with automated escalation.

| Attribute | Value |
|-----------|-------|
| **Frequency** | Every 5 minutes |
| **Duration** | Automated |
| **Owner** | SRE On-Call |
| **Artifact** | Health Dashboard, Alerts |

**Automated Checks**:
```yaml
health_checks:
  - name: "SLO Budget Check"
    query: "companyos:service:error_budget_burn_rate:ratio"
    threshold: "> 6"
    action: "page_oncall"

  - name: "Security Posture"
    query: "companyos:security:critical_cve_count:gauge"
    threshold: "> 0"
    action: "slack_security_channel"

  - name: "Active Incidents"
    query: "pagerduty_incidents_active_total"
    threshold: "> 0"
    action: "update_status_page"
```

**CompanyOS Surfaces**:
- Real-time health score badge on all dashboards
- Automated Slack digest at 6am, 12pm, 6pm
- PagerDuty integration for critical thresholds

---

### 2. Daily Standup (15 minutes)

**Purpose**: Team-level synchronization on blockers and priorities.

| Attribute | Value |
|-----------|-------|
| **Frequency** | Daily (9:00 AM local) |
| **Duration** | 15 minutes |
| **Owner** | Team Lead |
| **Participants** | Engineering Team |
| **Artifact** | Standup Notes (auto-generated) |

**CompanyOS Ready-Made Pack**:
```markdown
## Daily Standup Pack - {{ date }}

### Health Snapshot
- Platform Health Score: {{ health_score }}/100 ({{ health_trend }})
- Active Incidents: {{ active_incidents }}
- SLO Status: {{ slo_summary }}

### Yesterday's Deploys
{{ deploy_list }}

### Open Pull Requests (>24h)
{{ stale_prs }}

### Today's Scheduled
- Deployments: {{ scheduled_deploys }}
- Maintenance: {{ scheduled_maintenance }}
```

---

## Weekly Cadences

### 1. Ops Review (30 minutes)

**Purpose**: Review operational metrics, incidents, and reliability trends.

| Attribute | Value |
|-----------|-------|
| **Frequency** | Weekly (Monday 10:00 AM) |
| **Duration** | 30 minutes |
| **Owner** | SRE Lead |
| **Participants** | SRE Team, Engineering Leads |
| **Artifact** | Ops Review Dashboard |

**Agenda**:
1. **Incident Review** (10 min): Review all P1/P2 incidents from past week
2. **SLO Status** (10 min): Error budget consumption, burn rate trends
3. **Change Metrics** (5 min): Deployment frequency, failure rate
4. **Action Items** (5 min): Assign follow-ups

**CompanyOS Ready-Made Pack**:
```markdown
## Weekly Ops Review - Week {{ week_number }}

### Incident Summary
| Severity | Count | MTTR (avg) | Repeat? |
|----------|-------|------------|---------|
{{ incident_table }}

### SLO Performance
| Service | SLO Target | Actual | Budget Remaining |
|---------|------------|--------|------------------|
{{ slo_table }}

### DORA Metrics (WoW)
- Deployment Frequency: {{ deploy_freq }} ({{ deploy_freq_delta }})
- Lead Time: {{ lead_time }} ({{ lead_time_delta }})
- Change Failure Rate: {{ cfr }} ({{ cfr_delta }})
- MTTR: {{ mttr }} ({{ mttr_delta }})

### Action Items from Last Week
{{ previous_actions_status }}

### This Week's Focus
{{ auto_recommendations }}
```

---

### 2. Security Standup (30 minutes)

**Purpose**: Review security posture, vulnerabilities, and compliance status.

| Attribute | Value |
|-----------|-------|
| **Frequency** | Weekly (Tuesday 10:00 AM) |
| **Duration** | 30 minutes |
| **Owner** | Security Lead |
| **Participants** | Security Team, SRE Lead, Engineering Leads |
| **Artifact** | Security Posture Dashboard |

**Agenda**:
1. **Vulnerability Review** (15 min): New CVEs, remediation progress
2. **Security Events** (10 min): Failed auth, anomalies, investigations
3. **Compliance Updates** (5 min): Control status, upcoming audits

**CompanyOS Ready-Made Pack**:
```markdown
## Weekly Security Standup - {{ date }}

### Vulnerability Summary
| Severity | Open | New This Week | Closed | SLA Status |
|----------|------|---------------|--------|------------|
{{ vuln_table }}

### Critical CVEs Requiring Action
{{ critical_cve_list }}

### Security Events (7d)
- Failed Auth Attempts: {{ failed_auth }} ({{ failed_auth_trend }})
- Blocked Requests (WAF): {{ waf_blocks }}
- Anomaly Detections: {{ anomalies }}

### ABAC Policy Coverage: {{ abac_coverage }}%
### Compliance Control Status: {{ compliance_score }}%

### Pending Security Reviews
{{ pending_reviews }}
```

---

### 3. Product Metrics Review (30 minutes)

**Purpose**: Review product adoption, engagement, and customer health metrics.

| Attribute | Value |
|-----------|-------|
| **Frequency** | Weekly (Wednesday 2:00 PM) |
| **Duration** | 30 minutes |
| **Owner** | Product Lead |
| **Participants** | Product, Engineering, Customer Success |
| **Artifact** | Product Health Dashboard |

**Agenda**:
1. **Adoption Metrics** (10 min): DAU/WAU trends, new signups
2. **Feature Usage** (10 min): Feature flag adoption, A/B results
3. **Customer Signals** (10 min): Support tickets, NPS, churn risk

**CompanyOS Ready-Made Pack**:
```markdown
## Weekly Product Metrics - {{ date }}

### Engagement Summary
| Metric | This Week | Last Week | Delta | Trend |
|--------|-----------|-----------|-------|-------|
| DAU    | {{ dau }} | {{ dau_prev }} | {{ dau_delta }} | {{ dau_trend }} |
| WAU    | {{ wau }} | {{ wau_prev }} | {{ wau_delta }} | {{ wau_trend }} |
| Sessions/User | {{ sessions }} | {{ sessions_prev }} | {{ sessions_delta }} | {{ sessions_trend }} |

### Feature Adoption
{{ feature_adoption_table }}

### Customer Health Signals
- New Signups: {{ signups }}
- Churn Risk Accounts: {{ churn_risk_count }}
- Open Support Tickets: {{ support_tickets }}
- NPS (rolling 30d): {{ nps }}

### Top Feature Requests (from feedback)
{{ top_requests }}
```

---

## Bi-Weekly Cadences

### Sprint Review (1 hour)

**Purpose**: Demo completed work, gather feedback, assess sprint health.

| Attribute | Value |
|-----------|-------|
| **Frequency** | Bi-weekly (End of Sprint) |
| **Duration** | 1 hour |
| **Owner** | Engineering Manager |
| **Participants** | Engineering Team, Product, Stakeholders |
| **Artifact** | Sprint Review Dashboard |

**Agenda**:
1. **Sprint Goals Review** (5 min): Goals committed vs achieved
2. **Demos** (30 min): Live demonstrations of completed features
3. **Metrics Review** (15 min): Velocity, quality, cycle time
4. **Retrospective Items** (10 min): What worked, what didn't

**CompanyOS Ready-Made Pack**:
```markdown
## Sprint {{ sprint_number }} Review - {{ date }}

### Sprint Goals
| Goal | Status | Evidence |
|------|--------|----------|
{{ goals_table }}

### Completed Work
{{ completed_items }}

### Sprint Metrics
- Story Points Committed: {{ points_committed }}
- Story Points Delivered: {{ points_delivered }}
- Velocity Trend: {{ velocity_trend }}
- Cycle Time (avg): {{ cycle_time }}
- Bug Escape Rate: {{ bug_escape_rate }}

### Quality Metrics
- Test Coverage: {{ test_coverage }}%
- Build Success Rate: {{ build_success }}%
- Code Review Turnaround: {{ review_time }}

### Carryover to Next Sprint
{{ carryover_items }}
```

---

## Monthly Cadences

### 1. Executive Review (1 hour)

**Purpose**: Leadership review of all dimensions - reliability, security, product, financials, efficiency.

| Attribute | Value |
|-----------|-------|
| **Frequency** | Monthly (First Monday) |
| **Duration** | 1 hour |
| **Owner** | CTO |
| **Participants** | CEO, CTO, CISO, VP Engineering, VP Product, CFO |
| **Artifact** | Exec Cockpit Dashboard |

**Agenda**:
1. **Health Score Review** (10 min): Composite score, dimension breakdown
2. **Reliability Deep Dive** (10 min): SLOs, incidents, trends
3. **Security Posture** (10 min): Vulnerabilities, compliance, risks
4. **Product & Growth** (15 min): Adoption, engagement, customer health
5. **Financial Review** (10 min): NRR, costs, unit economics
6. **Strategic Decisions** (5 min): Actions, investments, pivots

**CompanyOS Ready-Made Pack**:
```markdown
## Monthly Executive Review - {{ month }} {{ year }}

### Executive Summary
**Overall Health Score: {{ health_score }}/100 ({{ health_status }})**

| Dimension | Score | Trend | Key Highlight |
|-----------|-------|-------|---------------|
| Reliability | {{ reliability_score }} | {{ reliability_trend }} | {{ reliability_highlight }} |
| Security | {{ security_score }} | {{ security_trend }} | {{ security_highlight }} |
| Product | {{ product_score }} | {{ product_trend }} | {{ product_highlight }} |
| Financials | {{ financial_score }} | {{ financial_trend }} | {{ financial_highlight }} |
| Efficiency | {{ efficiency_score }} | {{ efficiency_trend }} | {{ efficiency_highlight }} |

### Top 3 Wins
{{ wins_list }}

### Top 3 Risks
{{ risks_list }}

### Key Decisions Required
{{ decisions_list }}

### OKR Progress
{{ okr_progress_table }}
```

---

### 2. FinOps Review (45 minutes)

**Purpose**: Review cloud costs, unit economics, and cost optimization opportunities.

| Attribute | Value |
|-----------|-------|
| **Frequency** | Monthly (Second Week) |
| **Duration** | 45 minutes |
| **Owner** | FinOps Lead / CFO |
| **Participants** | CFO, CTO, Engineering Leads, SRE Lead |
| **Artifact** | FinOps Dashboard |

**Agenda**:
1. **Cost Overview** (15 min): Total spend, MoM changes, budget vs actual
2. **Service Breakdown** (15 min): Cost by service, tenant, team
3. **Optimization Opportunities** (10 min): Recommendations, reserved capacity
4. **Forecasting** (5 min): Next month projection

**CompanyOS Ready-Made Pack**:
```markdown
## Monthly FinOps Review - {{ month }} {{ year }}

### Cost Summary
| Metric | Actual | Budget | Variance |
|--------|--------|--------|----------|
| Total Cloud Spend | ${{ total_spend }} | ${{ budget }} | {{ variance }}% |
| Cost per MAU | ${{ cost_per_mau }} | ${{ target_per_mau }} | {{ cpu_variance }}% |
| Infrastructure | ${{ infra_spend }} | - | {{ infra_mom }}% MoM |

### Top Cost Drivers
{{ cost_drivers_table }}

### Cost by Team/Domain
{{ team_costs_table }}

### Optimization Opportunities
{{ optimization_recommendations }}

### Reserved Capacity Status
- Savings Plans Coverage: {{ sp_coverage }}%
- Reserved Instances: {{ ri_coverage }}%
- Spot Instance Usage: {{ spot_percentage }}%

### Next Month Forecast: ${{ forecast }}
```

---

### 3. Board Pack Preparation (2 hours)

**Purpose**: Prepare monthly/quarterly investor/board update materials.

| Attribute | Value |
|-----------|-------|
| **Frequency** | Monthly (Last Week) |
| **Duration** | 2 hours |
| **Owner** | CEO / CFO |
| **Participants** | Executive Team |
| **Artifact** | Board Pack (Slides + Data) |

**CompanyOS Auto-Generated Sections**:
- Financial Summary (ARR, NRR, Margins)
- Customer Metrics (DAU, WAU, Churn)
- Platform Health (SLOs, Incidents)
- Security Posture Summary
- Key Accomplishments & Risks

---

## Quarterly Cadences

### 1. Quarterly Business Review (QBR) (4 hours)

**Purpose**: Comprehensive review of quarter performance and next quarter planning.

| Attribute | Value |
|-----------|-------|
| **Frequency** | Quarterly |
| **Duration** | 4 hours |
| **Owner** | CEO |
| **Participants** | Executive Team, Department Heads |
| **Artifact** | QBR Dashboard + Presentation |

**Agenda**:
1. **Quarter in Review** (1 hr): All dimension performance, OKR results
2. **Customer Deep Dive** (45 min): Wins, losses, feedback themes
3. **Technical Deep Dive** (45 min): Architecture decisions, tech debt, roadmap
4. **Financial Review** (30 min): Full P&L, forecasting, investments
5. **Next Quarter Planning** (1 hr): OKRs, priorities, resource allocation

**CompanyOS Ready-Made Pack**:
```markdown
## Q{{ quarter }} {{ year }} Business Review

### Quarter Summary
**Health Score Trend**: {{ q_start_score }} → {{ q_end_score }}

### OKR Results
{{ okr_results_table }}

### Dimension Performance
{{ dimension_quarterly_comparison }}

### Key Achievements
{{ achievements_list }}

### Misses & Learnings
{{ misses_list }}

### Customer Metrics
- Net New ARR: ${{ new_arr }}
- Churned ARR: ${{ churned_arr }}
- Net Revenue Retention: {{ nrr }}%
- Logo Retention: {{ logo_retention }}%

### Platform Metrics
- Total Incidents (P1/P2): {{ incidents }}
- SLO Attainment: {{ slo_avg }}%
- Deploys: {{ deploy_count }}
- Features Shipped: {{ features }}

### Next Quarter Focus
{{ next_quarter_priorities }}
```

---

### 2. Quarterly Planning (2 days)

**Purpose**: Set OKRs, allocate resources, and align on priorities for next quarter.

| Attribute | Value |
|-----------|-------|
| **Frequency** | Quarterly (Last 2 weeks of quarter) |
| **Duration** | 2 days |
| **Owner** | CEO / CTO |
| **Participants** | Executive Team, Engineering Managers |
| **Artifact** | OKRs, Roadmap, Resource Plan |

**Day 1 - Strategic Alignment**:
- Company strategy review
- Market/competitive landscape
- Customer feedback synthesis
- Priority themes identification

**Day 2 - Tactical Planning**:
- OKR drafting
- Resource allocation
- Dependency mapping
- Risk assessment

---

## CompanyOS Dashboard Auto-Packs

### Meeting Pack Generator

CompanyOS provides automated meeting preparation packs that:

1. **Pre-populate dashboards** with relevant metrics 24 hours before scheduled meetings
2. **Generate diff views** comparing current period to previous
3. **Highlight anomalies** using ML-based detection
4. **Create executive summaries** for leadership meetings
5. **Export to multiple formats**: PDF, Slides, Notion, Confluence

### Pack Configuration

```yaml
# companyos/meeting-packs/ops-review.yaml
name: "Weekly Ops Review"
schedule: "0 8 * * 1"  # Monday 8am (1hr before meeting)
recipients:
  - role: sre_team
  - role: engineering_leads

sections:
  - type: incident_summary
    lookback: 7d
    severity: [P1, P2]

  - type: slo_performance
    services: all
    include_budget_remaining: true

  - type: dora_metrics
    compare_to: previous_week

  - type: action_items
    source: previous_meeting
    show_status: true

  - type: recommendations
    model: anomaly_detector
    threshold: 0.8

delivery:
  - channel: slack
    destination: "#ops-review"
  - channel: email
    destination: "{{recipients}}"
  - channel: dashboard
    url: "/dashboards/ops-review"
```

---

## Responsibilities Matrix (RACI)

| Activity | CEO | CTO | CISO | VP Eng | VP Prod | SRE Lead | FinOps |
|----------|-----|-----|------|--------|---------|----------|--------|
| Daily Health Check | I | I | I | I | I | **R/A** | I |
| Weekly Ops Review | I | **A** | C | **R** | I | **R** | I |
| Weekly Security | I | C | **R/A** | C | I | C | I |
| Weekly Product | I | C | I | C | **R/A** | I | I |
| Monthly Exec Review | **A** | **R** | **R** | C | **R** | C | **R** |
| Monthly FinOps | C | C | I | C | I | C | **R/A** |
| QBR | **R/A** | **R** | **R** | **R** | **R** | C | **R** |
| Quarterly Planning | **A** | **R** | C | **R** | **R** | C | C |

**Legend**: R = Responsible, A = Accountable, C = Consulted, I = Informed

---

## Artifact Storage & Access

### Dashboard URLs

| Dashboard | URL | Access Level |
|-----------|-----|--------------|
| Exec Cockpit | `/dashboards/exec-cockpit` | Leadership |
| CTO Dashboard | `/dashboards/cto` | CTO, VP Eng |
| CISO Dashboard | `/dashboards/ciso` | CISO, Security |
| Ops Review | `/dashboards/ops-review` | Engineering |
| Product Health | `/dashboards/product-health` | Product, Eng |
| FinOps | `/dashboards/finops` | Finance, Eng Leads |

### Meeting Notes Repository

```
docs/meetings/
├── ops-reviews/
│   └── YYYY-MM-DD.md
├── security-standups/
│   └── YYYY-MM-DD.md
├── exec-reviews/
│   └── YYYY-MM.md
├── qbrs/
│   └── YYYY-QN.md
└── templates/
    └── *.md
```

---

## Success Metrics for Operating Rhythm

### Rhythm Effectiveness KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Meeting Start Time Adherence | 95% | Automated tracking |
| Decision Time (avg) | <48hr | Issue tracking |
| Action Item Completion | >90% | Task tracking |
| Dashboard Usage (weekly) | >80% users | Analytics |
| Pack Generation Success | 100% | System monitoring |

### Continuous Improvement

- **Monthly**: Review meeting effectiveness surveys
- **Quarterly**: Adjust cadences based on team feedback
- **Annually**: Full rhythm audit and optimization

---

## Related Documents

- [KPI & Health Model](./kpi-health-model.md)
- [Exec Cockpit Specification](./exec-cockpit-spec.md)
- [Exec-Ready Metrics Checklist](./exec-ready-checklist.md)

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1.0 | 2025-12-07 | Platform Engineering | Initial Operating Rhythm |
