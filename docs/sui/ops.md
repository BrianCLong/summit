# Summit Underwriting Intelligence (SUI) Operations Plan

## 1. Overview
This document details the operational strategy for Summit Underwriting Intelligence (SUI), covering ingestion, storage, SLOs, cost boundaries, runbooks, and CI checks for GA.

## 2. Ingestion & Storage Strategy

### Offline-First Ingestion
- Ingestion connectors (OSINT, Attack Surface, CVE Intel) run as controlled batch jobs, not real-time API calls.
- **Snapshot Storage:** Each scoring run operates against an immutable snapshot of the entity's data. This guarantees determinism for UDR-AC benchmarks and safe multi-tenant isolation.
- **Residency-aware Deployment:** Data is partitioned by tenant and region, using cryptographic envelopes per tenant.

## 3. SLOs (Service Level Objectives)

- **API Latency (`/score`):** Target p95 latency < 300ms on a warmed cache. (Note: These are initial assumptions and should be adjusted per customer tier).
- **Portfolio Drift Jobs:** Scheduled execution on a daily/hourly cadence per customer tier, with strict bounded runtimes to prevent resource exhaustion.
- **UDR-AC Benchmark:** Must achieve a score ≥ 0.99 for all deterministic evaluations.

## 4. Cost Caps & Boundaries

- **Hard Caps Per Tenant:**
  - Maximum entities monitored.
  - Maximum ingestion bandwidth (GB/day or requests/day to connectors).
  - Maximum number of drift alerts per day.

## 5. Rollout & Rollback Strategy

- Deployments utilize snapshot-centric scoring, allowing easy reversion to previous model weights or feature extraction logic.
- Rollbacks are triggered if:
  - Evidence validation fails.
  - Unexpected score spikes occur across a large portion of a portfolio.
  - Connector data schema migrations fail.

## 6. Runbooks

Critical operational runbooks to be developed:
- `runbooks/bad-score-spike.md`: Handling sudden shifts in portfolio risk scores.
- `runbooks/connector-outage.md`: Dealing with upstream data feed failures (e.g., CVE intel down).
- `runbooks/schema-migration-rollback.md`: Reverting failed database/graph schema updates.
- `runbooks/evidence-verify-fail.md`: Troubleshooting when CI evidence generation or validation fails.

## 7. CI Checks & Software Supply Chain

- **Evidence First CI:** CI fails if evidence artifacts (`report.json`, `metrics.json`, `stamp.json`) do not validate or if determinism drifts.
- **SBOM Generation:** A Software Bill of Materials (SBOM) is generated per build using `syft scan` with `--output cyclonedx-json=PATH` to track dependencies, particularly third-party scanners or data feeds.
- **Provenance:** SLSA-style attestations for builds.
- **Dependency Management:** Strict version pinning and offline build support to maintain reproducibility.
