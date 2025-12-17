# Exec-Ready Metrics Checklist

> **Version**: 0.1.0
> **Last Updated**: 2025-12-07
> **Status**: Active
> **Owner**: Platform Engineering

---

## Overview

This checklist defines the criteria a metric must meet before it can be surfaced in an executive dashboard. The goal is to ensure every metric an executive sees is trustworthy, actionable, and answerable within 30 seconds.

**Guiding Principle**: *"Evidence or it didn't happen."* If a metric doesn't meet these criteria, it's not exec-ready.

---

## Quick Reference Checklist

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     METRIC IS EXEC-READY IF...                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DATA QUALITY                          PRESENTATION                         │
│  ─────────────                         ────────────                         │
│  □ Has defined data source             □ Has clear, jargon-free name        │
│  □ Has documented collection method    □ Has unit of measurement            │
│  □ Has known refresh rate              □ Has threshold indicators           │
│  □ Has data validation rules           □ Has trend visualization            │
│  □ Has backfill/gap handling           □ Has drill-down path                │
│                                                                             │
│  CONTEXT                               OPERATIONAL                          │
│  ───────                               ───────────                          │
│  □ Has business definition             □ Has designated owner               │
│  □ Has target/benchmark                □ Has alert configuration            │
│  □ Has comparison period               □ Has runbook for anomalies          │
│  □ Has executive sponsor               □ Has SLA for data freshness         │
│  □ Has documented limitations          □ Has audit trail                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Requirements

### 1. Data Quality Requirements

#### 1.1 Data Source Definition
- [ ] **Source Identified**: Clear documentation of where data originates
- [ ] **Source Reliability**: Data source has its own SLO (≥99.9% availability)
- [ ] **Single Source of Truth**: No conflicting data sources for same metric
- [ ] **Schema Documented**: Data schema is versioned and documented

```yaml
# Example: Good data source definition
metric: slo_attainment
data_source:
  name: Prometheus
  endpoint: http://prometheus:9090
  query: "companyos:service:slo_attainment:ratio"
  reliability_slo: 99.99%
  schema_version: 1.2.0
  documentation: docs/metrics/slo-attainment.md
```

#### 1.2 Collection Method
- [ ] **Collection Mechanism**: Push, pull, or event-driven clearly specified
- [ ] **Sampling Strategy**: Full census or sampling with documented rate
- [ ] **Aggregation Rules**: How raw data becomes the displayed metric
- [ ] **Time Zone Handling**: UTC storage, local display rules documented

#### 1.3 Refresh Rate
- [ ] **Refresh Interval**: Documented and enforced (e.g., "every 5 minutes")
- [ ] **Staleness Indicator**: Visual indicator when data is stale
- [ ] **Max Staleness**: Maximum acceptable age before metric is marked invalid
- [ ] **Last Updated Timestamp**: Always visible on dashboard

```yaml
# Example: Refresh rate specification
metric: active_tenants
refresh:
  interval: 5m
  max_staleness: 30m
  stale_action: show_warning_badge
  timestamp_display: true
```

#### 1.4 Data Validation
- [ ] **Range Validation**: Impossible values are rejected (e.g., >100% not allowed)
- [ ] **Null Handling**: Explicit rules for missing data
- [ ] **Outlier Detection**: Statistical anomalies flagged
- [ ] **Consistency Checks**: Cross-metric validation rules

#### 1.5 Gap Handling
- [ ] **Backfill Policy**: How historical gaps are filled
- [ ] **Interpolation Rules**: If/how missing points are estimated
- [ ] **Gap Visibility**: Gaps are visible, not hidden
- [ ] **Recovery SLA**: Time to restore data after outage

---

### 2. Context Requirements

#### 2.1 Business Definition
- [ ] **Plain English Definition**: Non-technical explanation
- [ ] **Business Impact**: Why this metric matters
- [ ] **Audience Relevance**: Which personas need this metric
- [ ] **Decision Support**: What decisions this metric informs

```markdown
# Example: Business definition
## SLO Attainment

**Definition**: The percentage of time our services meet their promised
reliability targets over a 30-day rolling window.

**Business Impact**: Directly correlates to customer trust and contract SLAs.
Below 99.9% triggers penalty clauses in enterprise contracts.

**Audience**: CTO, VP Engineering, SRE Lead

**Decisions Supported**:
- Engineering resource allocation
- Infrastructure investment
- Customer communication timing
```

#### 2.2 Target/Benchmark
- [ ] **Target Value**: Clear success threshold
- [ ] **Target Source**: How target was determined (historical, industry, contract)
- [ ] **Benchmark Comparison**: Industry or peer comparison if available
- [ ] **Target Review Cadence**: When targets are re-evaluated

```yaml
# Example: Target specification
metric: change_failure_rate
target:
  value: 0.05  # 5%
  source: DORA_research_elite_performer
  benchmark:
    industry: 0.15  # 15% industry average
    peer_group: 0.08  # 8% among similar companies
  review_cadence: quarterly
```

#### 2.3 Comparison Period
- [ ] **Default Timeframe**: Standard view (e.g., 30 days)
- [ ] **Comparison Options**: WoW, MoM, QoQ, YoY available
- [ ] **Trend Direction**: Clear up/down/flat indicators
- [ ] **Seasonality Notes**: Known seasonal patterns documented

#### 2.4 Executive Sponsor
- [ ] **Sponsor Assigned**: Named executive accountable for metric
- [ ] **Review Commitment**: Sponsor reviews metric in defined cadence
- [ ] **Escalation Path**: What happens when metric goes critical
- [ ] **Sign-off**: Sponsor has approved metric for exec dashboard

#### 2.5 Limitations
- [ ] **Known Limitations**: What the metric doesn't capture
- [ ] **Edge Cases**: Scenarios where metric may be misleading
- [ ] **Data Lag**: Any delays in data availability
- [ ] **Calculation Caveats**: Special rules or exclusions

```markdown
# Example: Documented limitations
## NRR (Net Revenue Retention) Limitations

1. **Data Lag**: Revenue data has 48-hour delay from billing system
2. **Exclusions**: Does not include one-time professional services
3. **Cohort Definition**: Based on contract start month, not signup
4. **Currency**: All amounts in USD, FX applied at daily rate
5. **Seasonality**: Q4 typically inflated due to annual renewals
```

---

### 3. Presentation Requirements

#### 3.1 Naming
- [ ] **Clear Name**: No acronyms without expansion (first use)
- [ ] **Consistent Naming**: Same name across all dashboards
- [ ] **Action-Oriented**: Name implies what to do (e.g., "SLO Budget Remaining")
- [ ] **No Jargon**: Understandable without technical background

```yaml
# Example: Good vs Bad naming
bad_names:
  - "p95_http_req_ms"
  - "DORA_CFR"
  - "neo4j_qps"

good_names:
  - "API Response Time (95th percentile)"
  - "Change Failure Rate"
  - "Graph Query Throughput"
```

#### 3.2 Units
- [ ] **Unit Displayed**: Always show unit (%, ms, $, count)
- [ ] **Appropriate Precision**: Right number of decimal places
- [ ] **Human-Readable**: Use K, M, B for large numbers
- [ ] **Consistent Units**: Same unit across related metrics

```yaml
# Example: Unit specifications
metrics:
  - name: Response Time
    unit: ms
    precision: 0

  - name: Error Rate
    unit: percent
    precision: 2

  - name: Revenue
    unit: USD
    precision: 0
    humanize: true  # $1.2M instead of $1,234,567
```

#### 3.3 Thresholds
- [ ] **Visual Thresholds**: Color coding (green/yellow/red)
- [ ] **Threshold Values**: Documented cutoff points
- [ ] **Threshold Rationale**: Why these thresholds
- [ ] **Directional Clarity**: Is up good or bad?

```yaml
# Example: Threshold configuration
metric: slo_attainment
thresholds:
  - status: healthy
    color: green
    range: [0.999, 1.0]
    meaning: "Meeting SLO targets"

  - status: warning
    color: yellow
    range: [0.99, 0.999)
    meaning: "Approaching SLO boundary"

  - status: critical
    color: red
    range: [0, 0.99)
    meaning: "SLO breached, action required"

direction: higher_is_better
```

#### 3.4 Trend Visualization
- [ ] **Trend Line**: Show historical trend
- [ ] **Trend Indicator**: Up/down arrow or icon
- [ ] **Comparison Delta**: Show change from previous period
- [ ] **Trend Period**: Specify comparison window (e.g., "vs last week")

#### 3.5 Drill-Down Path
- [ ] **Drill-Down Available**: Click to see more detail
- [ ] **Drill-Down Path Documented**: Where each click leads
- [ ] **Breadcrumb Navigation**: Can navigate back up
- [ ] **Context Preservation**: Filters maintained during drill-down

```yaml
# Example: Drill-down path
metric: company_health_score
drill_down:
  level_1:
    name: Dimension Scores
    path: /dashboards/dimension-breakdown

  level_2:
    name: Domain Scores
    path: /dashboards/domain/{domain}

  level_3:
    name: Service Metrics
    path: /dashboards/service/{service}

  level_4:
    name: Trace Details
    path: /traces/{trace_id}
```

---

### 4. Operational Requirements

#### 4.1 Ownership
- [ ] **Technical Owner**: Engineer responsible for metric health
- [ ] **Business Owner**: Business stakeholder accountable
- [ ] **On-Call Coverage**: Who to contact for issues
- [ ] **Escalation Matrix**: Escalation path for critical issues

```yaml
# Example: Ownership specification
metric: net_revenue_retention
ownership:
  technical_owner:
    name: Finance Engineering Team
    slack: "#finance-eng"

  business_owner:
    name: CFO
    email: cfo@company.com

  oncall:
    team: finance-data
    pagerduty_service: finance-metrics

  escalation:
    - level: 1
      contact: finance-eng-lead
      after: 15m
    - level: 2
      contact: vp-finance
      after: 1h
```

#### 4.2 Alerting
- [ ] **Alert Defined**: Threshold-based alerting configured
- [ ] **Alert Recipients**: Right personas receive alerts
- [ ] **Alert Severity**: Appropriate severity levels
- [ ] **Alert Fatigue Mitigation**: Not too noisy

```yaml
# Example: Alert configuration
metric: slo_attainment
alerts:
  - name: SLOBudgetWarning
    condition: value < 0.999 for 10m
    severity: warning
    recipients: [cto, sre-lead]
    channels: [slack, email]

  - name: SLOBudgetCritical
    condition: value < 0.99 for 5m
    severity: critical
    recipients: [cto, sre-oncall]
    channels: [pagerduty, slack, sms]
```

#### 4.3 Runbooks
- [ ] **Anomaly Runbook**: What to do when metric is unexpected
- [ ] **Investigation Steps**: How to diagnose issues
- [ ] **Common Causes**: Known reasons for anomalies
- [ ] **Resolution Actions**: Documented fixes

```markdown
# Example: Runbook reference
## SLO Attainment Anomaly Runbook

**Location**: runbooks/slo-attainment-anomaly.md

### Quick Actions
1. Check for active incidents: /incidents
2. Review recent deploys: /deploys?timeframe=4h
3. Check error budget burn rate: /dashboards/slo-burn

### Common Causes
- Recent deployment with bug
- Upstream dependency failure
- Traffic spike exceeding capacity
- Database performance degradation

### Escalation
If not resolved in 15 minutes, page SRE secondary.
```

#### 4.4 Data Freshness SLA
- [ ] **Freshness SLA**: Committed data freshness (e.g., "within 5 minutes")
- [ ] **SLA Monitoring**: Freshness is itself monitored
- [ ] **SLA Breach Alerts**: Alert when freshness SLA violated
- [ ] **SLA Reporting**: Track freshness SLA over time

```yaml
# Example: Freshness SLA
metric: active_incidents
freshness_sla:
  target: 1m
  max_acceptable: 5m
  monitoring:
    enabled: true
    alert_on_breach: true
    reporting: weekly
```

#### 4.5 Audit Trail
- [ ] **Change History**: Who changed metric definition and when
- [ ] **Version Control**: Metric definitions in git
- [ ] **Approval Workflow**: Changes require review
- [ ] **Rollback Capability**: Can revert to previous definition

---

## Certification Process

### Steps to Certify a Metric as Exec-Ready

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     METRIC CERTIFICATION WORKFLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. PROPOSE          2. DOCUMENT         3. IMPLEMENT        4. CERTIFY    │
│  ────────           ──────────          ────────────        ──────────     │
│                                                                             │
│  ┌──────────┐       ┌──────────┐        ┌──────────┐       ┌──────────┐   │
│  │ Metric   │──────►│ Complete │───────►│ Build    │──────►│ Review   │   │
│  │ Proposal │       │ Spec Doc │        │ Dashboard│       │ & Approve│   │
│  └──────────┘       └──────────┘        └──────────┘       └──────────┘   │
│       │                  │                   │                  │          │
│       ▼                  ▼                   ▼                  ▼          │
│  - Business case    - All checklist     - Grafana panel    - Tech review  │
│  - Exec sponsor       items complete    - Alerts config    - Business     │
│  - Target audience  - Runbook written   - Drill-downs        review       │
│                     - Owner assigned                       - Sign-off     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1. Proposal Phase
- Submit metric proposal with business justification
- Identify executive sponsor
- Define target audience (CEO, CTO, CISO, etc.)
- Get initial buy-in from stakeholders

### 2. Documentation Phase
- Complete all checklist items in this document
- Write runbook for anomaly handling
- Assign technical and business owners
- Document limitations and caveats

### 3. Implementation Phase
- Build Grafana panel/dashboard
- Configure alerting
- Implement drill-down paths
- Set up freshness monitoring

### 4. Certification Phase
- Technical review by Platform Engineering
- Business review by Executive Sponsor
- Final sign-off from Exec Cockpit owner
- Add to certified metrics registry

---

## Certification Checklist Template

```yaml
# metric-certification.yaml
metric_name: "Example Metric"
certification_date: "2025-12-07"
certifier: "Platform Engineering"

# Data Quality
data_quality:
  source_defined: true
  collection_documented: true
  refresh_rate_specified: true
  validation_rules: true
  gap_handling: true

# Context
context:
  business_definition: true
  target_specified: true
  comparison_period: true
  executive_sponsor: "CTO"
  limitations_documented: true

# Presentation
presentation:
  clear_name: true
  unit_displayed: true
  thresholds_configured: true
  trend_visualization: true
  drill_down_path: true

# Operational
operational:
  owner_assigned: true
  alerts_configured: true
  runbook_exists: true
  freshness_sla: true
  audit_trail: true

# Approvals
approvals:
  technical_review:
    reviewer: "SRE Lead"
    date: "2025-12-06"
    approved: true
  business_review:
    reviewer: "CTO"
    date: "2025-12-07"
    approved: true

certification_status: "CERTIFIED"
next_review_date: "2026-03-07"
```

---

## Anti-Patterns to Avoid

### Metrics That Are NOT Exec-Ready

| Anti-Pattern | Example | Why It's Bad |
|--------------|---------|--------------|
| **Vanity Metric** | "Total API calls ever" | Doesn't inform decisions |
| **No Target** | "CPU usage: 45%" | 45% of what? Good or bad? |
| **Jargon-Heavy** | "p99 gRPC latency" | Executives don't know gRPC |
| **No Drill-Down** | Dashboard-only metric | Can't investigate issues |
| **Stale Data** | "Last updated: 3 days ago" | Not actionable |
| **No Owner** | Orphaned metric | No one to fix issues |
| **Hidden Limitations** | "NRR: 120%" (one-time spike) | Misleading without context |
| **Alert Fatigue** | Fires 10x/day | Gets ignored |

---

## Periodic Review

### Quarterly Metric Health Check

Every quarter, review all exec-ready metrics:

- [ ] Is the metric still relevant to business decisions?
- [ ] Are targets still appropriate?
- [ ] Is data quality maintained?
- [ ] Are alerts firing appropriately (not too much, not too little)?
- [ ] Has the business definition changed?
- [ ] Is documentation still accurate?

### Annual Certification Renewal

All certified metrics require annual re-certification:

- [ ] Re-run full checklist
- [ ] Update documentation
- [ ] Verify ownership
- [ ] Refresh targets based on new benchmarks
- [ ] Executive sponsor re-approval

---

## Related Documents

- [KPI & Health Model](./kpi-health-model.md)
- [Operating Rhythm v0](./operating-rhythm-v0.md)
- [Exec Cockpit Specification](./exec-cockpit-spec.md)

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1.0 | 2025-12-07 | Platform Engineering | Initial Exec-Ready Checklist |
