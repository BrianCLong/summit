# Service Level Indicators (SLIs) & Objectives (SLOs)

This document defines the reliability targets for the Summit platform (GA Release).

## Definitions

- **SLI**: A quantitative measure of some aspect of the level of service that is provided.
- **SLO**: A target value or range of values for a service level that is measured by an SLI.

## GA SLO Targets

| Metric | SLI Description | SLO Target (Monthly) | Measurement Window |
|--------|-----------------|----------------------|--------------------|
| **Availability** | Percentage of successful API responses (HTTP 2xx/3xx/4xx excluding 429) vs Total Requests | 99.9% | 30 days |
| **Latency** | 95th percentile (p95) latency of API requests | < 500ms | 30 days |
| **Throughput** | Successful job completions per minute | N/A (Tracking) | 5 mins |
| **Durability** | Percentage of successful write operations to primary storage | 99.99% | 30 days |

## Alerting Policy

- **Page**: Burn rate > 14.4x (2% budget consumed in 1 hour)
- **Ticket**: Burn rate > 1x (10% budget consumed in 3 days)

## Dashboards

Reliability dashboards are provisioned via the `observability` Terraform module and viewable in CloudWatch/Grafana.
