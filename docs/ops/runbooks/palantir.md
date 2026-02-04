# Palantir Replacement Runbook

## Service Overview
This service suite replaces Palantir Foundry/Gotham workflows with Summit's Graph Intelligence platform.

## SLOs & Budgets
- **Availability**: 99.9% (Summit Core)
- **Ingest Latency**: < 500ms per event
- **Query Latency**: < 2s for 3-hop graph traversals
- **Cost**: < $0.001 per query

## Drift Detection
The `scripts/monitoring/palantir-drift.sh` script runs nightly to detect:
1.  **Performance Regression**: Runtime > 500ms on smoke tests.
2.  **Cost Spikes**: Est. cost > budget.
3.  **Schema Drift**: Breaking changes to Ontology imports.

## Troubleshooting

### Symptom: High Latency in Graph Queries
- **Check**: `reports/palantir/metrics.json` for recent runs.
- **Action**: Check `EvidenceBudget` constraints in query logic. Reduce max-hops.

### Symptom: Import Failure
- **Check**: `summit/integrations/palantir.py` validation errors.
- **Action**: Verify input JSON against `schemas/palantir/ontology.schema.json`.

## Rollback
If a deployment violates policies:
1.  Revert the commit.
2.  Run `scripts/bench/palantir.py` to verify the fix.
