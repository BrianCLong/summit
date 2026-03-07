# Ops Verification Gate

This document lists the deterministic validators run by the `ops-verify` gate.

## Unified Entrypoint

- **Script:** `scripts/verification/verify_ops.sh`
- **Target:** `make ops-verify` (or via CI)
- **Scope:** Observability (Prometheus, Grafana), Storage/DR (Cache, Partition, DR specs).
- **Philosophy:** Fast, secretless, deterministic. No network calls to production.

## Validators

### 1. Prometheus Rules Validator

- **Script:** `scripts/verification/verify_prometheus_rules.ts`
- **Inputs:** `monitoring/alerts.yaml`, `observability/prometheus/alerts/*.yaml`
- **Checks:**
  - YAML syntax validity (basic structure).
  - Existence of `groups` key or `alerting_rules` (legacy).
  - Basic rule structure (alert name, expr).

### 2. Grafana Dashboards Validator

- **Script:** `scripts/verification/verify_grafana_dashboards.ts`
- **Inputs:** `observability/dashboards/*.json`
- **Checks:**
  - JSON syntax validity.
  - Existence of `title` and `panels`/`rows`.

### 3. Storage & DR Validator

- **Script:** `scripts/verification/verify_storage_dr.ts`
- **Inputs:**
  - `server/src/lib/db/TenantSafePostgres.ts` (Cache/Isolation)
  - `server/src/services/TenantPartitioningService.ts` (Partition)
  - `docs/resilience/MULTI_REGION_ARCHITECTURE.md` (DR Objectives)
- **Checks:**
  - File existence.
  - Key string presence (e.g. "RTO", "RPO", "partition", "tenant").

## Running Locally

```bash
# Run all
scripts/verification/verify_ops.sh

# Run subset
VERIFY_OPS_TARGET=observability scripts/verification/verify_ops.sh
VERIFY_OPS_TARGET=storage scripts/verification/verify_ops.sh
```
