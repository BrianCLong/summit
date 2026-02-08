# Runbook: CogWar Adaptive Influence Systems (2026)

## 1. Overview
This system detects adaptive influence operations, swarms, and cross-domain linkages.

## 2. Alerts
- **Drift Detected:** Metrics have deviated from baseline fixtures.
- **Schema Validation Failed:** Ingested data or output artifacts do not match schemas.
- **Budget Exceeded:** Analysis job took > 120s or > 1GB RAM.

## 3. Operations
### Manual Analysis
Run the CLI:
```bash
npx tsx packages/cogwar/src/cli.ts analyze --fixtures <path-to-data> --out <output-dir>
```

### Drift Check
Run the monitoring script:
```bash
npx tsx scripts/monitoring/cogwar-adaptive-influence-systems-2026-drift.ts
```

### Troubleshooting
1. Verify fixtures exist and contain valid JSONL.
2. Check `report.json` for `metrics` values.
3. Review logs for ingestion errors.

## 4. Maintenance
- Update `fixtures/cogwar` with new adversarial patterns quarterly.
- Adjust thresholds in `packages/cogwar/src/detectors/*.ts` based on false positive rates.
