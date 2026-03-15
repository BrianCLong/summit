# CI Monitoring & Health Check Automation

We implement automated scheduling workflows to act as hourly and daily signals for repository health.

## Hourly Monitoring (`0 * * * *`)
* Located at: `.github/workflows/monitoring.yml`
* Executes:
  - `ci_health.ts`
  - `determinism_drift.ts`
  - `repo_entropy.ts`
  - `security_drift.ts`
* Deterministically outputs artifacts into `artifacts/monitoring/*.json`.

## Daily Benchmarks (`0 0 * * *`)
* Located at: `.github/workflows/daily-benchmarks.yml`
* Executes:
  - `run_graphrag.ts`
* Deterministically outputs artifacts into `artifacts/benchmarks/graphrag/*.json`.
