# Fast Backout / Rollback Procedure

## Signals to Rollback Immediately

- PRR: Production error rate >1% sustained 5m.
- SLO burn rate >2× over budget for 10m.
- Cosign verification failure post‑deploy (cluster image mismatch), or policy breach in Gatekeeper.

## Rollback Steps

1. `helm rollback <release> <previous-revision> -n <ns>`
2. Invalidate edge caches/CDN if web assets changed.
3. Verify health + rerun k6 canary on previous.
4. File incident ticket with timeline + attach logs and Grafana snapshots.

## Data Migrations

- Prefer **forward‑only** migrations with no DROP in same release; if backward‑incompatible, schedule maintenance + feature flags.
- If backward break shipped, activate read‑only mode and run `down.sql` (only if explicitly safe and tested).

## CDN Cache Bust

```bash
curl -X POST https://api.cdn/purge -H 'Authorization: Bearer …' -d '{"paths":["/*"]}'
```
