# Graph ↔ Postgres Drift Gate

## Purpose

This gate detects content drift between Postgres (system of record) and Neo4j (graph projection) by comparing row/label counts and canonical digests. It is designed for GA governance gates that must surface divergence before deployments proceed.

## Inputs

- **Postgres**: digest views such as `gov_users_digests` that emit `id` + `digest`.
- **Neo4j**: Cypher digest queries that emit `id` + `digest` using the same canonical fields.
- **Policy**: `config/governance/drift.yml` defines thresholds and queries.

## Runbook

```bash
node scripts/ci/graph_postgres_drift_check.mjs \
  --config config/governance/drift.yml \
  --out artifacts/governance/graph-postgres-drift
```

## Outputs

- `report.json` — machine-readable drift report.
- `metrics.json` / `metrics.prom` — Prometheus/OpenMetrics compatible output.
- `stamp.json` — evidence stamp with hash and timestamp.

## Governance Expectations

- Drift thresholds are enforced per entity.
- Evidence is written to `evidence/drift/YYYY-MM-DD/` as a governed artifact path.
- Failures are treated as gated exceptions and reconciled via batched graph updates.
