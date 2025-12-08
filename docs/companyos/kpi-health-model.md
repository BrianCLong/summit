# CompanyOS KPI & Health Model

> **Version**: 0.1.0
> **Last Updated**: 2025-12-07
> **Status**: Active
> **Owner**: Platform Engineering

---

## Overview

This document defines the KPI & Health Model for CompanyOS, providing a structured framework for measuring platform health, customer success, and operational excellence across five core dimensions.

**Guiding Principle**: *"Evidence or it didn't happen."* Every executive question about health must be answerable from observability data within 30 seconds.

---

## Core Dimensions

CompanyOS health is measured across five interconnected dimensions:

```
                    ┌─────────────────────────────────────────┐
                    │          COMPANY HEALTH SCORE           │
                    │      (Composite: 0-100, weighted)       │
                    └─────────────────────────────────────────┘
                                       │
        ┌──────────────┬───────────────┼───────────────┬──────────────┐
        ▼              ▼               ▼               ▼              ▼
   ┌─────────┐   ┌──────────┐   ┌───────────┐   ┌──────────┐   ┌──────────┐
   │RELIABIL-│   │ SECURITY │   │  PRODUCT  │   │FINANCIALS│   │EFFICIENCY│
   │  ITY    │   │          │   │ ADOPTION  │   │          │   │          │
   │  (25%)  │   │  (25%)   │   │   (20%)   │   │  (15%)   │   │  (15%)   │
   └─────────┘   └──────────┘   └───────────┘   └──────────┘   └──────────┘
```

---

## 1. Reliability Dimension (25%)

### Primary KPIs

| KPI | Definition | Target | Critical Threshold | Data Source |
|-----|------------|--------|-------------------|-------------|
| **SLO Attainment** | % of services meeting SLO | ≥99.9% | <99.5% | Prometheus |
| **Error Budget Burn Rate** | Rate of SLO budget consumption | <1x | >6x | Prometheus |
| **Change Failure Rate** | % of changes causing incidents | <5% | >15% | GitHub + PagerDuty |
| **MTTR** | Mean time to recovery (minutes) | <30min | >60min | PagerDuty |
| **P1 Incident Count** | Critical incidents per month | <2 | >5 | PagerDuty |

### Cascading Metrics

```yaml
# Company → Domain → Service cascade
company:
  reliability_score: avg(domain_reliability_scores)

domain_level:  # e.g., "Data Platform", "API Gateway", "Frontend"
  reliability_score: weighted_avg(service_slo_attainments)
  change_failure_rate: incidents_caused_by_changes / total_changes

service_level:
  slo_attainment: 1 - (error_budget_consumed / error_budget_total)
  availability: successful_requests / total_requests
  latency_p95: histogram_quantile(0.95, request_duration)
  latency_p99: histogram_quantile(0.99, request_duration)
```

### Prometheus Recording Rules

```yaml
# Service-level SLO
- record: companyos:service:slo_attainment:ratio
  expr: |
    1 - (
      sum by (service) (slo:error_budget_consumed:ratio)
      /
      sum by (service) (slo:error_budget_total:ratio)
    )

# Domain-level aggregation
- record: companyos:domain:reliability_score:ratio
  expr: |
    avg by (domain) (
      companyos:service:slo_attainment:ratio
      * on(service) group_left(domain) service_domain_mapping
    )

# Company-level composite
- record: companyos:company:reliability_score:ratio
  expr: avg(companyos:domain:reliability_score:ratio)
```

---

## 2. Security Dimension (25%)

### Primary KPIs

| KPI | Definition | Target | Critical Threshold | Data Source |
|-----|------------|--------|-------------------|-------------|
| **Vulnerability SLA Compliance** | % of vulns remediated within SLA | ≥95% | <85% | Snyk/Trivy |
| **Critical CVE Age** | Days since oldest unpatched critical | 0 days | >7 days | Snyk |
| **ABAC Policy Coverage** | % of endpoints with policy | 100% | <95% | OPA |
| **Failed Auth Attempts** | Anomalous auth failures/hour | <100 | >1000 | Auth Logs |
| **Secret Scan Violations** | Committed secrets detected | 0 | >0 | Gitleaks |
| **Compliance Score** | SOC2/FedRAMP control adherence | ≥98% | <90% | Compliance Dashboard |

### Cascading Metrics

```yaml
company:
  security_posture_score: weighted_avg([
    vuln_sla_compliance * 0.30,
    abac_coverage * 0.25,
    compliance_score * 0.25,
    secret_scan_clean * 0.20
  ])

domain_level:
  vuln_exposure: count(critical_vulns) + count(high_vulns) * 0.5
  policy_coverage: endpoints_with_policy / total_endpoints

service_level:
  dependency_vulns: count(snyk_issues{severity=~"critical|high"})
  container_vulns: count(trivy_vulns{severity=~"CRITICAL|HIGH"})
  policy_defined: bool(opa_policy_exists)
```

### Security Scoring Formula

```
Security Score = (
  (100 - min(critical_cve_age_days * 10, 100)) * 0.30 +
  vuln_sla_compliance_pct * 0.25 +
  abac_coverage_pct * 0.20 +
  (100 - min(secret_violations * 50, 100)) * 0.15 +
  compliance_control_pct * 0.10
)
```

---

## 3. Product Adoption Dimension (20%)

### Primary KPIs

| KPI | Definition | Target | Critical Threshold | Data Source |
|-----|------------|--------|-------------------|-------------|
| **Active Tenants (DAU)** | Daily active unique tenants | Growing MoM | Declining | Analytics |
| **Weekly Active Users (WAU)** | Users active in 7-day window | Growing MoM | Declining | Analytics |
| **Feature Adoption Rate** | % using key features | ≥60% | <30% | Feature Flags |
| **API Call Volume** | Requests per day | Growing MoM | Declining | Prometheus |
| **Session Duration** | Avg time per session (min) | ≥15min | <5min | Analytics |
| **NPS Score** | Net Promoter Score | ≥50 | <20 | Surveys |

### Cascading Metrics

```yaml
company:
  product_health_score: weighted_avg([
    tenant_growth_rate * 0.30,
    feature_adoption_rate * 0.25,
    engagement_score * 0.25,
    nps_normalized * 0.20
  ])

cohort_level:  # e.g., "Enterprise", "SMB", "Free"
  cohort_growth: (tenants_end - tenants_start) / tenants_start
  feature_penetration: users_using_feature / total_users_in_cohort

tenant_level:
  engagement_score: (sessions * actions_per_session) / benchmark
  feature_flags_enabled: count(enabled_flags) / count(total_flags)
  api_utilization: api_calls / api_quota
```

### Product Health Recording Rules

```yaml
- record: companyos:product:active_tenants:count
  expr: count(count by (tenant_id) (session_events_total{event="active"}))

- record: companyos:product:feature_adoption:ratio
  expr: |
    sum(feature_flag_evaluations_total{result="enabled"}) by (feature)
    /
    sum(feature_flag_evaluations_total) by (feature)

- record: companyos:product:engagement_score:gauge
  expr: |
    avg by (cohort) (
      rate(user_actions_total[24h]) * avg_over_time(session_duration_seconds[24h])
    ) / 1000
```

---

## 4. Financials Dimension (15%)

### Primary KPIs

| KPI | Definition | Target | Critical Threshold | Data Source |
|-----|------------|--------|-------------------|-------------|
| **Net Revenue Retention (NRR)** | Revenue retained + expansion | ≥110% | <90% | Billing |
| **Gross Margin** | (Revenue - COGS) / Revenue | ≥70% | <60% | Finance |
| **Infra Cost per Active Unit** | Monthly cloud cost / MAU | Decreasing | Increasing >10% | AWS CUR |
| **CAC Payback Period** | Months to recover acquisition cost | <12mo | >18mo | Finance |
| **ARR Growth Rate** | YoY recurring revenue growth | ≥30% | <10% | Billing |

### Cascading Metrics

```yaml
company:
  financial_health_score: weighted_avg([
    nrr_normalized * 0.30,
    gross_margin_normalized * 0.25,
    cost_efficiency_score * 0.25,
    growth_rate_normalized * 0.20
  ])

product_line:
  unit_economics: (revenue_per_user - cost_per_user) / revenue_per_user
  margin_contribution: product_gross_margin / total_gross_margin

tenant_level:
  tenant_health_score: nrr * engagement_score
  cost_to_serve: allocated_infra_cost / tenant_revenue
  expansion_potential: feature_utilization * growth_rate
```

### FinOps Recording Rules

```yaml
- record: companyos:finops:cost_per_mau:usd
  expr: |
    sum(aws_cur_cost_usd{service=~"EC2|EKS|RDS|ElastiCache"})
    /
    companyos:product:monthly_active_users:count

- record: companyos:finops:gross_margin:ratio
  expr: |
    (sum(billing_revenue_usd) - sum(aws_cur_cost_usd))
    /
    sum(billing_revenue_usd)

- record: companyos:finops:nrr:ratio
  expr: |
    (
      sum(billing_revenue_usd{period="current"})
      + sum(billing_expansion_usd)
      - sum(billing_churn_usd)
    ) / sum(billing_revenue_usd{period="previous"})
```

---

## 5. Efficiency Dimension (15%)

### Primary KPIs

| KPI | Definition | Target | Critical Threshold | Data Source |
|-----|------------|--------|-------------------|-------------|
| **Deployment Frequency** | Deploys per day | ≥10/day | <1/day | GitHub Actions |
| **Lead Time for Changes** | Commit to production (hours) | <4hr | >24hr | GitHub |
| **Build Success Rate** | % of CI builds passing | ≥95% | <85% | GitHub Actions |
| **Test Coverage** | Code covered by tests | ≥80% | <60% | Jest/Vitest |
| **Infra Utilization** | Actual vs provisioned resources | ≥60% | <40% | Prometheus |
| **Toil Ratio** | Manual ops time / total ops time | <20% | >40% | Time Tracking |

### Cascading Metrics

```yaml
company:
  efficiency_score: weighted_avg([
    dora_metrics_score * 0.40,
    resource_efficiency * 0.30,
    developer_productivity * 0.30
  ])

team_level:
  deployment_frequency: count(deployments) / days
  lead_time: avg(deploy_time - commit_time)
  change_failure_rate: failed_deploys / total_deploys

service_level:
  cpu_utilization: avg(container_cpu_usage) / avg(container_cpu_limit)
  memory_utilization: avg(container_memory_usage) / avg(container_memory_limit)
  build_time: avg(ci_build_duration_seconds)
```

### DORA Metrics Recording Rules

```yaml
- record: companyos:dora:deployment_frequency:rate
  expr: |
    sum(increase(deployment_total[24h])) by (team)

- record: companyos:dora:lead_time:seconds
  expr: |
    histogram_quantile(0.50,
      sum(rate(commit_to_deploy_seconds_bucket[7d])) by (le, team)
    )

- record: companyos:dora:change_failure_rate:ratio
  expr: |
    sum(increase(deployment_failures_total[30d])) by (team)
    /
    sum(increase(deployment_total[30d])) by (team)

- record: companyos:dora:mttr:seconds
  expr: |
    avg(incident_resolution_seconds) by (team)
```

---

## Composite Health Score

### Formula

```python
def calculate_company_health_score():
    """
    Calculate the composite CompanyOS Health Score (0-100)
    """
    weights = {
        'reliability': 0.25,
        'security': 0.25,
        'product_adoption': 0.20,
        'financials': 0.15,
        'efficiency': 0.15
    }

    scores = {
        'reliability': calculate_reliability_score(),      # 0-100
        'security': calculate_security_score(),            # 0-100
        'product_adoption': calculate_adoption_score(),    # 0-100
        'financials': calculate_financial_score(),         # 0-100
        'efficiency': calculate_efficiency_score()         # 0-100
    }

    composite = sum(scores[dim] * weights[dim] for dim in weights)

    return {
        'composite_score': composite,
        'dimension_scores': scores,
        'health_status': 'HEALTHY' if composite >= 80 else
                        'ATTENTION' if composite >= 60 else
                        'CRITICAL',
        'timestamp': datetime.utcnow().isoformat()
    }
```

### Health Status Thresholds

| Score Range | Status | Color | Action Required |
|-------------|--------|-------|-----------------|
| 90-100 | Excellent | Green | Continue monitoring |
| 80-89 | Healthy | Light Green | Review weekly |
| 60-79 | Attention | Yellow | Investigate trends |
| 40-59 | Warning | Orange | Active remediation |
| 0-39 | Critical | Red | Immediate escalation |

### Prometheus Composite Rule

```yaml
- record: companyos:health:composite_score:gauge
  expr: |
    (companyos:reliability:score:gauge * 0.25) +
    (companyos:security:score:gauge * 0.25) +
    (companyos:product:score:gauge * 0.20) +
    (companyos:financials:score:gauge * 0.15) +
    (companyos:efficiency:score:gauge * 0.15)
```

---

## KPI Cascade Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           COMPANY LEVEL                                     │
│  - Composite Health Score    - NRR    - SLO Attainment    - Active Tenants │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│ Data Platform │           │  API Gateway  │           │   Frontend    │
│    Domain     │           │    Domain     │           │    Domain     │
├───────────────┤           ├───────────────┤           ├───────────────┤
│ - Neo4j SLO   │           │ - Gateway SLO │           │ - Web SLO     │
│ - Ingest Rate │           │ - Auth Rate   │           │ - FCP p95     │
│ - Query Perf  │           │ - Rate Limits │           │ - Error Rate  │
└───────┬───────┘           └───────┬───────┘           └───────┬───────┘
        │                           │                           │
   ┌────┴────┐                 ┌────┴────┐                 ┌────┴────┐
   ▼         ▼                 ▼         ▼                 ▼         ▼
┌──────┐ ┌──────┐         ┌──────┐ ┌──────┐         ┌──────┐ ┌──────┐
│neo4j │ │ingest│         │gateway│ │ auth │         │ web  │ │apollo│
│      │ │      │         │      │ │      │         │      │ │client│
├──────┤ ├──────┤         ├──────┤ ├──────┤         ├──────┤ ├──────┤
│p95   │ │thru- │         │p99   │ │fail  │         │LCP   │ │cache │
│error │ │put   │         │error │ │rate  │         │FID   │ │hit   │
│rate  │ │lag   │         │rate  │ │      │         │CLS   │ │rate  │
└──────┘ └──────┘         └──────┘ └──────┘         └──────┘ └──────┘
```

---

## Data Sources & Collection

### Required Integrations

| Data Source | KPI Categories | Collection Method | Refresh Rate |
|-------------|---------------|-------------------|--------------|
| **Prometheus** | Reliability, Efficiency | Pull metrics | 15s |
| **PagerDuty** | Incidents, MTTR | Webhook + API | Real-time |
| **GitHub** | DORA metrics, Changes | Webhook + API | Real-time |
| **Snyk/Trivy** | Security vulns | API polling | 1hr |
| **OPA** | Policy coverage | Metrics endpoint | 1min |
| **AWS CUR** | FinOps costs | S3 + Athena | Daily |
| **Billing System** | Revenue, NRR | API | Daily |
| **Analytics** | Product adoption | Event stream | Real-time |
| **Feature Flags** | Adoption rates | LaunchDarkly API | 5min |

### Metric Retention Policy

| Metric Type | Raw Retention | Aggregated Retention |
|-------------|--------------|---------------------|
| Service metrics | 15 days | 2 years (1h rollup) |
| Business metrics | 30 days | 5 years (1d rollup) |
| Security events | 90 days | 7 years (compliance) |
| Financial metrics | 30 days | 7 years |

---

## Alert Thresholds

### Reliability Alerts

```yaml
groups:
  - name: companyos.reliability.alerts
    rules:
      - alert: SLOBudgetBurning
        expr: companyos:service:error_budget_burn_rate:ratio > 6
        for: 5m
        labels:
          severity: warning
          dimension: reliability
        annotations:
          summary: "Service {{ $labels.service }} burning SLO budget at {{ $value }}x"

      - alert: SLOBudgetExhausted
        expr: companyos:service:slo_attainment:ratio < 0.995
        for: 5m
        labels:
          severity: critical
          dimension: reliability
        annotations:
          summary: "Service {{ $labels.service }} SLO attainment below 99.5%"
```

### Security Alerts

```yaml
groups:
  - name: companyos.security.alerts
    rules:
      - alert: CriticalVulnerabilityUnpatched
        expr: companyos:security:critical_cve_age_days:gauge > 7
        for: 1h
        labels:
          severity: critical
          dimension: security
        annotations:
          summary: "Critical CVE unpatched for {{ $value }} days"

      - alert: ABACPolicyCoverageDropped
        expr: companyos:security:abac_coverage:ratio < 0.95
        for: 10m
        labels:
          severity: warning
          dimension: security
        annotations:
          summary: "ABAC policy coverage dropped to {{ $value | humanizePercentage }}"
```

---

## Related Documents

- [Operating Rhythm v0](./operating-rhythm-v0.md)
- [Exec Cockpit Specification](./exec-cockpit-spec.md)
- [Exec-Ready Metrics Checklist](./exec-ready-checklist.md)
- [SLO Definitions](../SLOs.md)
- [OKRs](../OKRs.md)

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1.0 | 2025-12-07 | Platform Engineering | Initial KPI & Health Model |
