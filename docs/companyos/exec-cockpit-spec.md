# CompanyOS Exec Cockpit Specification

> **Version**: 0.1.0
> **Last Updated**: 2025-12-07
> **Status**: Active
> **Owner**: Platform Engineering

---

## Overview

The Exec Cockpit provides role-specific dashboards that enable leadership to answer critical business questions within 30 seconds. Each persona gets a default view optimized for their responsibilities, with drill-down capabilities to investigate root causes.

**Guiding Principle**: *"Evidence or it didn't happen."* Any exec question about health must be answerable from this cockpit.

---

## Personas & Default Views

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXEC COCKPIT PERSONAS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────────┐  │
│   │   CEO   │   │   CTO   │   │  CISO   │   │Head Ops │   │Head Product │  │
│   └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘   └──────┬──────┘  │
│        │             │             │             │                │         │
│        ▼             ▼             ▼             ▼                ▼         │
│   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────────┐  │
│   │Business │   │Technical│   │Security │   │Platform │   │   Product   │  │
│   │Overview │   │Health   │   │Posture  │   │Operations│  │  Adoption   │  │
│   │Dashboard│   │Dashboard│   │Dashboard│   │Dashboard │  │  Dashboard  │  │
│   └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────────┘  │
│                                                                             │
│   Focus:        Focus:        Focus:        Focus:        Focus:           │
│   - NRR         - SLOs        - CVEs        - Incidents   - DAU/WAU        │
│   - Growth      - DORA        - Compliance  - Capacity    - Features       │
│   - Costs       - Arch Health - Threats     - Costs       - NPS            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. CEO Dashboard - Business Overview

### Purpose
Provide a comprehensive view of business health, combining financial performance, customer metrics, and platform stability into a single executive summary.

### Key Questions Answered
- "Are we on track for our quarterly targets?"
- "How healthy is our customer base?"
- "What are the biggest risks to the business?"
- "How efficient is our operation?"

### Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CEO DASHBOARD - BUSINESS OVERVIEW                           [Last 30 days] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    COMPANY HEALTH SCORE: 87/100                      │   │
│  │    ████████████████████████████████████████████░░░░░░░░  (HEALTHY)   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐   │
│  │ ARR           │ │ NRR           │ │ Active Tenants│ │ SLO Attainment│   │
│  │ $4.2M         │ │ 115%          │ │ 847           │ │ 99.92%        │   │
│  │ ▲ 12% QoQ     │ │ ▲ 3% vs tgt   │ │ ▲ 23 new      │ │ ● Within SLA  │   │
│  └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘   │
│                                                                             │
│  ┌────────────────────────────────┐ ┌────────────────────────────────────┐ │
│  │ DIMENSION SCORES               │ │ KEY RISKS                          │ │
│  │ ──────────────────             │ │ ──────────────                     │ │
│  │ Reliability  ████████░░ 89     │ │ ⚠ 3 enterprise accounts at risk   │ │
│  │ Security     █████████░ 92     │ │ ⚠ Q4 hiring behind plan (-2 eng)  │ │
│  │ Product      ███████░░░ 78     │ │ ⚠ Competitor launched feature X   │ │
│  │ Financials   ████████░░ 85     │ │                                    │ │
│  │ Efficiency   ████████░░ 84     │ │ → Drill down for details           │ │
│  └────────────────────────────────┘ └────────────────────────────────────┘ │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ OKR PROGRESS (Q4 2025)                                                 ││
│  │ O1: Ship MVP with >90% green path ████████████████░░░░ 80% (On Track) ││
│  │ O2: Data coverage & scale         ██████████████░░░░░░ 70% (At Risk)  ││
│  │ O3: Trust & safety               ████████████████████ 95% (Ahead)     ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Metrics & Data Sources

| Panel | Metric | Query/Source | Refresh |
|-------|--------|--------------|---------|
| Health Score | Composite Score | `companyos:health:composite_score:gauge` | 5min |
| ARR | Annual Recurring Revenue | Billing API | Daily |
| NRR | Net Revenue Retention | Billing API | Daily |
| Active Tenants | DAU count | `companyos:product:active_tenants:count` | 1hr |
| SLO Attainment | Aggregate SLO | `avg(companyos:service:slo_attainment:ratio)` | 5min |
| Dimension Scores | Per-dimension | Prometheus recording rules | 5min |
| OKR Progress | OKR tracking | OKR system API | Daily |

### Alerts (CEO)

```yaml
ceo_alerts:
  - name: NRRBelowTarget
    condition: nrr_ratio < 1.0
    severity: high
    delivery: email, slack_dm

  - name: HealthScoreCritical
    condition: health_score < 60
    severity: critical
    delivery: email, slack_dm, sms

  - name: ChurnRiskAlert
    condition: enterprise_accounts_at_risk > 2
    severity: high
    delivery: email
```

---

## 2. CTO Dashboard - Technical Health

### Purpose
Provide visibility into platform reliability, engineering velocity, and technical debt to enable informed architectural and resourcing decisions.

### Key Questions Answered
- "Are we meeting our reliability targets?"
- "How fast are we shipping?"
- "What's the state of our technical debt?"
- "Where are our biggest operational risks?"

### Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CTO DASHBOARD - TECHNICAL HEALTH                            [Last 7 days]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PLATFORM STATUS: HEALTHY                     INCIDENTS: 0 Active    │   │
│  │ ● All services operational                   Last P1: 12 days ago   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ SLO PERFORMANCE                                                       │ │
│  │ ┌─────────┬───────────┬────────────┬─────────────┬──────────────────┐ │ │
│  │ │ Service │ Target    │ Actual     │ Budget Left │ Status           │ │ │
│  │ ├─────────┼───────────┼────────────┼─────────────┼──────────────────┤ │ │
│  │ │ API     │ 99.9%     │ 99.94%     │ 72%         │ ● Healthy        │ │ │
│  │ │ Gateway │ 99.95%    │ 99.97%     │ 85%         │ ● Healthy        │ │ │
│  │ │ Web     │ 99.9%     │ 99.88%     │ 45%         │ ⚠ Watch          │ │ │
│  │ │ Neo4j   │ 99.99%    │ 99.995%    │ 90%         │ ● Healthy        │ │ │
│  │ │ Redis   │ 99.99%    │ 99.999%    │ 95%         │ ● Healthy        │ │ │
│  │ └─────────┴───────────┴────────────┴─────────────┴──────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌────────────────────────────────┐ ┌────────────────────────────────────┐ │
│  │ DORA METRICS (7d)              │ │ ERROR BUDGET BURN (30d)            │ │
│  │ ────────────────               │ │ ──────────────────────             │ │
│  │ Deploy Frequency: 47/week      │ │                                    │ │
│  │   ▲ Elite (target: >1/day)     │ │    [BURN RATE CHART - API/Web]    │ │
│  │                                │ │                                    │ │
│  │ Lead Time: 2.3 hours           │ │    API:  ━━━━━━━━━━━━░░░ 28%     │ │
│  │   ▲ Elite (target: <1 day)     │ │    Web:  ━━━━━━━━━━━━━━━░ 55%     │ │
│  │                                │ │    GW:   ━━━━━━░░░░░░░░░ 15%     │ │
│  │ Change Failure: 4.2%           │ │                                    │ │
│  │   ● Elite (target: <5%)        │ │                                    │ │
│  │                                │ │                                    │ │
│  │ MTTR: 18 minutes               │ │                                    │ │
│  │   ▲ Elite (target: <1 hr)      │ │                                    │ │
│  └────────────────────────────────┘ └────────────────────────────────────┘ │
│                                                                             │
│  ┌────────────────────────────────┐ ┌────────────────────────────────────┐ │
│  │ RECENT INCIDENTS               │ │ ARCHITECTURE HEALTH                │ │
│  │ ────────────────               │ │ ───────────────────                │ │
│  │ P2 - API Latency Spike (3d)    │ │ Test Coverage: 78% (▲ 2%)         │ │
│  │   Duration: 23min | Cause: DB  │ │ Type Coverage: 65%                 │ │
│  │   → Post-mortem completed      │ │ Lint Pass Rate: 97%                │ │
│  │                                │ │ Dependency Age: 12 days avg        │ │
│  │ P3 - Slow queries (5d)         │ │ Critical Deps: 2 outdated          │ │
│  │   Duration: 1hr | Cause: Index │ │                                    │ │
│  │   → Fix deployed               │ │ Tech Debt Items: 34                │ │
│  │                                │ │ Security Debt: 8 items             │ │
│  └────────────────────────────────┘ └────────────────────────────────────┘ │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ DRILL-DOWN NAVIGATION                                                  ││
│  │ [SLO Details] [Incident History] [Deploy Pipeline] [Service Map]      ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Metrics & Data Sources

| Panel | Metric | Query/Source | Refresh |
|-------|--------|--------------|---------|
| Platform Status | Service health | Health check aggregation | 1min |
| SLO Performance | Per-service SLO | `companyos:service:slo_attainment:ratio` | 5min |
| Error Budget | Budget remaining | `1 - slo:error_budget_consumed:ratio` | 5min |
| Deploy Frequency | Deploys/week | GitHub Actions API | Real-time |
| Lead Time | Commit to prod | `histogram_quantile(0.5, commit_to_deploy_seconds_bucket)` | 1hr |
| Change Failure | Failed deploys % | GitHub + PagerDuty correlation | 1hr |
| MTTR | Recovery time | PagerDuty API | Real-time |
| Test Coverage | Jest coverage | CI metrics | Per-build |

### Alerts (CTO)

```yaml
cto_alerts:
  - name: SLOBudgetBurning
    condition: error_budget_burn_rate > 6
    severity: warning
    delivery: slack_dm, email

  - name: SLOBudgetExhausted
    condition: error_budget_remaining < 0.1
    severity: critical
    delivery: pagerduty, slack_dm

  - name: P1IncidentDeclared
    condition: incident_severity == "P1"
    severity: critical
    delivery: pagerduty, sms, slack_dm

  - name: DORARegression
    condition: change_failure_rate > 0.15
    severity: warning
    delivery: email

  - name: CriticalDependencyOutdated
    condition: critical_dep_age_days > 30
    severity: warning
    delivery: email
```

### Drill-Down Paths

```
CTO Dashboard
├── SLO Details → Service SLO Dashboard
│   ├── Latency breakdown by endpoint
│   ├── Error types and distribution
│   └── Traffic patterns
│
├── Incident History → Incident Dashboard
│   ├── Timeline view
│   ├── Root cause analysis
│   └── Post-mortem links
│
├── Deploy Pipeline → CI/CD Dashboard
│   ├── Build status by branch
│   ├── Test results
│   └── Deployment queue
│
└── Service Map → Architecture View
    ├── Dependency graph
    ├── Traffic flow
    └── Health per service
```

---

## 3. CISO Dashboard - Security Posture

### Purpose
Provide comprehensive visibility into security vulnerabilities, compliance status, and threat detection to enable proactive risk management.

### Key Questions Answered
- "Are we compliant with our security standards?"
- "What's our vulnerability exposure?"
- "Are there active threats or anomalies?"
- "What's blocking our security roadmap?"

### Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CISO DASHBOARD - SECURITY POSTURE                           [Last 30 days] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ SECURITY SCORE: 92/100 (STRONG)              THREAT LEVEL: LOW      │   │
│  │ ████████████████████████████████████████████░░░░░░░░                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐   │
│  │ Critical CVEs │ │ Compliance    │ │ ABAC Coverage │ │ Secret Scans  │   │
│  │ 0             │ │ 98.2%         │ │ 100%          │ │ Clean ✓       │   │
│  │ ● All clear   │ │ SOC2 Type II  │ │ All endpoints │ │ 0 violations  │   │
│  └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘   │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ VULNERABILITY SUMMARY                                                 │ │
│  │ ┌───────────┬───────┬──────────┬────────────┬────────────┬─────────┐ │ │
│  │ │ Severity  │ Open  │ New (7d) │ Fixed (7d) │ SLA Status │ Oldest  │ │ │
│  │ ├───────────┼───────┼──────────┼────────────┼────────────┼─────────┤ │ │
│  │ │ Critical  │ 0     │ 0        │ 1          │ ● Met      │ N/A     │ │ │
│  │ │ High      │ 3     │ 1        │ 4          │ ● Met      │ 5 days  │ │ │
│  │ │ Medium    │ 12    │ 3        │ 8          │ ● Met      │ 18 days │ │ │
│  │ │ Low       │ 28    │ 5        │ 2          │ ⚠ Review   │ 45 days │ │ │
│  │ └───────────┴───────┴──────────┴────────────┴────────────┴─────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌────────────────────────────────┐ ┌────────────────────────────────────┐ │
│  │ COMPLIANCE CONTROLS            │ │ THREAT DETECTION (24h)             │ │
│  │ ──────────────────             │ │ ────────────────────               │ │
│  │ SOC2 Type II: 98.2%            │ │ Failed Auth Attempts: 847          │ │
│  │   CC6.1 ● │ CC6.6 ● │ CC6.7 ●  │ │   Baseline: 920 (▼ 8%)            │ │
│  │   CC7.1 ● │ CC7.2 ● │ CC8.1 ●  │ │                                    │ │
│  │                                │ │ WAF Blocks: 1,234                  │ │
│  │ FedRAMP: In Progress (67%)     │ │   Top: SQL Injection (45%)         │ │
│  │   AC-2 ⚠ │ AU-2 ● │ SC-7 ●     │ │                                    │ │
│  │                                │ │ Anomaly Score: 0.12 (LOW)          │ │
│  │ GDPR: 94%                      │ │   No active investigations         │ │
│  │   Art.32 ● │ Art.33 ● │ Art.35 ⚠│ │                                    │ │
│  └────────────────────────────────┘ └────────────────────────────────────┘ │
│                                                                             │
│  ┌────────────────────────────────┐ ┌────────────────────────────────────┐ │
│  │ SECURITY EVENTS (7d)           │ │ PENDING SECURITY REVIEWS           │ │
│  │ ─────────────────              │ │ ────────────────────────           │ │
│  │ ● Dependency update (2d)       │ │ PR #4521 - Auth refactor (3d)     │ │
│  │   CVE-2025-1234 patched        │ │   Assigned: @security-team         │ │
│  │                                │ │                                    │ │
│  │ ● Policy update (4d)           │ │ PR #4498 - API Gateway (5d)       │ │
│  │   OPA rule refinement          │ │   Status: In Review                │ │
│  │                                │ │                                    │ │
│  │ ● Audit completed (6d)         │ │ Architecture: Neo4j scaling       │ │
│  │   Q3 SOC2 evidence collected   │ │   Scheduled: Next week             │ │
│  └────────────────────────────────┘ └────────────────────────────────────┘ │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ DRILL-DOWN NAVIGATION                                                  ││
│  │ [Vuln Details] [Compliance Matrix] [Threat Analysis] [Audit Logs]     ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Metrics & Data Sources

| Panel | Metric | Query/Source | Refresh |
|-------|--------|--------------|---------|
| Security Score | Composite security | Security scoring formula | 1hr |
| Critical CVEs | Count critical | Snyk/Trivy API | 1hr |
| Compliance | Control coverage | Compliance system | Daily |
| ABAC Coverage | Policy coverage | OPA metrics | 5min |
| Secret Scans | Violations count | Gitleaks + CI | Per-commit |
| Failed Auth | Auth failures/24h | Auth logs aggregation | 5min |
| WAF Blocks | Blocked requests | WAF metrics | 5min |
| Anomaly Score | ML anomaly detection | Anomaly detector | 15min |

### Alerts (CISO)

```yaml
ciso_alerts:
  - name: CriticalCVEDetected
    condition: critical_cve_count > 0
    severity: critical
    delivery: pagerduty, slack_dm, sms

  - name: CVESLABreached
    condition: cve_sla_breach == true
    severity: high
    delivery: email, slack_dm

  - name: AnomalyDetected
    condition: anomaly_score > 0.8
    severity: high
    delivery: slack_dm, email

  - name: ComplianceDropped
    condition: compliance_score < 0.95
    severity: warning
    delivery: email

  - name: SecretCommitted
    condition: secret_violations > 0
    severity: critical
    delivery: pagerduty, slack_dm

  - name: ABACPolicyGap
    condition: abac_coverage < 1.0
    severity: high
    delivery: email, slack_dm
```

### Drill-Down Paths

```
CISO Dashboard
├── Vulnerability Details → Vuln Management
│   ├── CVE list with CVSS scores
│   ├── Affected services/packages
│   ├── Remediation status
│   └── Patch timeline
│
├── Compliance Matrix → Compliance Dashboard
│   ├── Control-by-control status
│   ├── Evidence collection
│   ├── Gap analysis
│   └── Audit timeline
│
├── Threat Analysis → Security Analytics
│   ├── Auth failure patterns
│   ├── Geographic anomalies
│   ├── Attack vector breakdown
│   └── Incident correlation
│
└── Audit Logs → Audit Trail
    ├── User activity logs
    ├── System changes
    ├── Access patterns
    └── Data exports
```

---

## 4. Head of Ops Dashboard - Platform Operations

### Purpose
Provide operational visibility into infrastructure health, incident management, capacity planning, and cost efficiency.

### Key Questions Answered
- "Is the platform healthy right now?"
- "What incidents are active or recent?"
- "Are we over/under-provisioned?"
- "What's driving our infrastructure costs?"

### Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ OPS DASHBOARD - PLATFORM OPERATIONS                         [Last 24 hours]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PLATFORM STATUS: ALL SYSTEMS OPERATIONAL                            │   │
│  │ ● API ● Gateway ● Web ● Neo4j ● PostgreSQL ● Redis ● Kafka          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐   │
│  │ Active        │ │ Deploys Today │ │ Infra Cost    │ │ Utilization   │   │
│  │ Incidents     │ │               │ │ (MTD)         │ │ (avg)         │   │
│  │ 0             │ │ 12            │ │ $45,231       │ │ 67%           │   │
│  │ ● Clear       │ │ ● All success │ │ ▼ 8% vs plan  │ │ ● Optimal     │   │
│  └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘   │
│                                                                             │
│  ┌────────────────────────────────┐ ┌────────────────────────────────────┐ │
│  │ SERVICE HEALTH MAP             │ │ CAPACITY STATUS                    │ │
│  │ ─────────────────              │ │ ───────────────                    │ │
│  │                                │ │                                    │ │
│  │   [Gateway]──►[API]──►[Neo4j]  │ │ EKS Nodes:     ████████░░ 75%     │ │
│  │       │         │              │ │ Pod Capacity:  ███████░░░ 68%     │ │
│  │       ▼         ▼              │ │ Neo4j Memory:  ██████████ 92% ⚠  │ │
│  │   [Auth]    [Redis]            │ │ PG Connections:████████░░ 78%     │ │
│  │       │         │              │ │ Redis Memory:  ██████░░░░ 54%     │ │
│  │       ▼         ▼              │ │ Kafka Topics:  ████░░░░░░ 35%     │ │
│  │   [Postgres] [Kafka]           │ │                                    │ │
│  │                                │ │ Scaling Events (24h): 3            │ │
│  │ Legend: ●OK ⚠Warn ○Down        │ │ Predicted Scale: +2 nodes (3d)     │ │
│  └────────────────────────────────┘ └────────────────────────────────────┘ │
│                                                                             │
│  ┌────────────────────────────────┐ ┌────────────────────────────────────┐ │
│  │ RECENT INCIDENTS (7d)          │ │ COST BREAKDOWN                     │ │
│  │ ────────────────────           │ │ ──────────────                     │ │
│  │ P2 #1234 - API Latency (3d)    │ │ EKS/EC2:     $28,450 (63%)        │ │
│  │   Duration: 23 min             │ │ RDS:         $8,120 (18%)         │ │
│  │   Impact: 0.02% errors         │ │ ElastiCache: $3,890 (9%)          │ │
│  │   Status: Resolved             │ │ S3:          $2,340 (5%)          │ │
│  │                                │ │ Other:       $2,431 (5%)          │ │
│  │ P3 #1228 - Slow Queries (5d)   │ │                                    │ │
│  │   Duration: 1 hr               │ │ Top Saving Opportunity:            │ │
│  │   Impact: Degraded perf        │ │ → Right-size 4 oversized nodes    │ │
│  │   Status: Resolved             │ │   Est. savings: $3,200/mo         │ │
│  └────────────────────────────────┘ └────────────────────────────────────┘ │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ DRILL-DOWN NAVIGATION                                                  ││
│  │ [Incident Details] [Capacity Planner] [Cost Explorer] [On-Call]       ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Head of Product Dashboard - Product Adoption

### Purpose
Provide visibility into product usage, feature adoption, customer engagement, and feedback to drive product decisions.

### Key Questions Answered
- "How engaged are our users?"
- "Which features are being adopted?"
- "What are customers struggling with?"
- "Where should we invest next?"

### Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PRODUCT DASHBOARD - ADOPTION & ENGAGEMENT                   [Last 30 days] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ PRODUCT HEALTH: 78/100 (ATTENTION)           NPS: +52 (PROMOTERS)   │   │
│  │ ████████████████████████████████░░░░░░░░░░░░░░░                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐   │
│  │ DAU           │ │ WAU           │ │ Sessions/User │ │ Retention     │   │
│  │ 1,247         │ │ 3,891         │ │ 4.2           │ │ 78%           │   │
│  │ ▲ 8% WoW      │ │ ▲ 12% MoM     │ │ ▲ 0.3 WoW     │ │ (D30)         │   │
│  └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘   │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ FEATURE ADOPTION                                                      │ │
│  │ ┌─────────────────────────┬──────────┬────────────┬─────────────────┐ │ │
│  │ │ Feature                 │ Adoption │ Trend (7d) │ Satisfaction    │ │ │
│  │ ├─────────────────────────┼──────────┼────────────┼─────────────────┤ │ │
│  │ │ Graph Explorer          │ 89%      │ ▲ +3%      │ ████████░░ 4.2  │ │ │
│  │ │ AI Copilot              │ 67%      │ ▲ +8%      │ █████████░ 4.5  │ │ │
│  │ │ Relationship Mapping    │ 54%      │ ▲ +2%      │ ███████░░░ 3.8  │ │ │
│  │ │ Export/Reports          │ 42%      │ ─ 0%       │ ██████░░░░ 3.2  │ │ │
│  │ │ Collaboration (new)     │ 23%      │ ▲ +15%     │ ████████░░ 4.0  │ │ │
│  │ └─────────────────────────┴──────────┴────────────┴─────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌────────────────────────────────┐ ┌────────────────────────────────────┐ │
│  │ ENGAGEMENT FUNNEL              │ │ CUSTOMER FEEDBACK                  │ │
│  │ ──────────────────             │ │ ─────────────────                  │ │
│  │ Signed Up:      100%           │ │ NPS Distribution:                  │ │
│  │   ▼                            │ │ Promoters (9-10): 58%              │ │
│  │ Activated:      73%            │ │ Passives (7-8):   36%              │ │
│  │   ▼                            │ │ Detractors (0-6): 6%               │ │
│  │ First Query:    61%            │ │                                    │ │
│  │   ▼                            │ │ Top Requests:                      │ │
│  │ Power User:     28%            │ │ 1. Better export options (42)      │ │
│  │   ▼                            │ │ 2. Mobile app (38)                 │ │
│  │ Expanded:       12%            │ │ 3. API improvements (31)           │ │
│  │                                │ │ 4. Dashboard customization (27)    │ │
│  └────────────────────────────────┘ └────────────────────────────────────┘ │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ DRILL-DOWN NAVIGATION                                                  ││
│  │ [User Cohorts] [Feature Analytics] [Support Tickets] [A/B Results]    ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Drill-Down Architecture

### Navigation Flow

```
Executive Cockpit (Any Persona)
         │
         ├──► KPI Deep Dive
         │    └── Service-level metrics
         │        └── Request-level traces
         │            └── Individual span details
         │
         ├──► Incident Investigation
         │    └── Timeline view
         │        └── Correlated logs
         │            └── Root cause traces
         │
         ├──► Change Correlation
         │    └── Recent deployments
         │        └── Commit details
         │            └── Code diff
         │
         └──► Dependency Explorer
              └── Service dependencies
                  └── Health per dependency
                      └── Traffic patterns
```

### Drill-Down Query Patterns

```yaml
# KPI → Service → Trace drill-down
level_1_kpi:
  metric: "companyos:health:composite_score:gauge"
  drill_down: "service_scores"

level_2_service:
  metric: "companyos:service:slo_attainment:ratio"
  filter: "service={{ selected_service }}"
  drill_down: "endpoint_metrics"

level_3_endpoint:
  metric: "http_request_duration_seconds_bucket"
  filter: "service={{ service }}, endpoint={{ endpoint }}"
  drill_down: "trace_id"

level_4_trace:
  source: "jaeger"
  query: "trace_id={{ trace_id }}"
```

---

## Alert Routing by Persona

### Alert Severity Matrix

| Alert Type | CEO | CTO | CISO | Head Ops | Head Product |
|------------|-----|-----|------|----------|--------------|
| P1 Incident | SMS | PagerDuty | Email | PagerDuty | Email |
| SLO Budget Exhausted | Email | PagerDuty | - | PagerDuty | - |
| Critical CVE | - | Email | PagerDuty | Email | - |
| NRR Below Target | Slack | - | - | - | Email |
| Churn Risk | Slack | - | - | - | PagerDuty |
| Cost Anomaly | Email | Email | - | PagerDuty | - |
| Compliance Drop | - | Email | PagerDuty | - | - |

### PagerDuty Integration

```yaml
# pagerduty-routes.yaml
routes:
  - match:
      severity: critical
      dimension: reliability
    receiver: sre_primary
    escalation:
      - after: 5m
        notify: sre_secondary
      - after: 15m
        notify: cto

  - match:
      severity: critical
      dimension: security
    receiver: security_primary
    escalation:
      - after: 5m
        notify: ciso
      - after: 15m
        notify: cto

  - match:
      severity: high
      dimension: financials
    receiver: finops_team
    escalation:
      - after: 30m
        notify: cfo
```

---

## Implementation Notes

### Dashboard Technology

- **Primary**: Grafana 10.x with Prometheus, Loki, Jaeger datasources
- **Athena Integration**: For AWS CUR cost queries
- **Custom Panels**: React plugins for specialized visualizations

### Data Freshness Requirements

| Dashboard | Critical Panels | Max Staleness |
|-----------|-----------------|---------------|
| CEO | Health Score, NRR | 1 hour |
| CTO | SLO Status, Incidents | 5 minutes |
| CISO | CVE Count, Anomalies | 15 minutes |
| Ops | Platform Status | 1 minute |
| Product | DAU/WAU | 1 hour |

### Access Control

```yaml
# grafana-rbac.yaml
teams:
  executives:
    dashboards:
      - ceo-dashboard: view
      - cto-dashboard: view
      - ciso-dashboard: view
    folders:
      - /Exec: view

  engineering_leads:
    dashboards:
      - cto-dashboard: view
      - ops-dashboard: view
    folders:
      - /Engineering: edit

  security_team:
    dashboards:
      - ciso-dashboard: edit
    folders:
      - /Security: edit
```

---

## Related Documents

- [KPI & Health Model](./kpi-health-model.md)
- [Operating Rhythm v0](./operating-rhythm-v0.md)
- [Exec-Ready Metrics Checklist](./exec-ready-checklist.md)

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1.0 | 2025-12-07 | Platform Engineering | Initial Exec Cockpit Spec |
