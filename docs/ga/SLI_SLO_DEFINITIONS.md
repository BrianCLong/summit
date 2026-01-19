# SLI/SLO Definitions (GA Baseline)

This document defines GA baseline SLIs/SLOs for Summit cloud deployments. Targets are environment-agnostic; enforcement is via dashboards and alert policies configured in IaC.

## Availability
- SLI: Successful request rate (HTTP < 500) over 5 minutes
- SLO: 99.9% monthly (prod), 99.5% monthly (stage)

## Latency
- SLI: p95 request latency for primary API endpoints (5 minutes)
- SLO: p95 <= 400ms (prod), p95 <= 600ms (stage)

## Error Budget Policy
- Error budget is tracked monthly per environment.
- A release is gated (manual approval required) if:
  - rolling 7-day availability < 99.8% in prod, or
  - p95 latency exceeds SLO for 3 consecutive evaluation windows.

## Saturation
- SLI: CPU utilization p95 (5 minutes) for core workloads
- SLO: p95 CPU <= 75% (prod), <= 85% (stage)

## Integrity Signals
- SLI: Verified provenance present for deploy artifacts (per build)
- SLO: 100% of prod releases must have provenance attestations and SBOM references recorded in the GA evidence map.

## Audit Artifacts
- Dashboards: provisioned via IaC module `iac/modules/observability`
- Evidence: stored under `artifacts/` and referenced in `docs/ga/evidence_map.yml`
