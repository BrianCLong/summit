# GA Release Plan — Maestro Conductor

- **Release Name/Tag:** `vX.Y.Z` (fill during `tag-ga`)
- **Release Branch:** `release/maestro-ga-YYYYMMDD`
- **Base Branch:** `main` (or `trunk`)

## Canary Plan
- Roll out to **5%**, watch p95 latency/err rate for 30 min
- Increase to **25%** if SLO burn < threshold; verify golden paths
- Increase to **50%**, repeat checks
- Go **100%** after soak + business sign-off

### Auto-Rollback Criteria
- Error rate > baseline + 2% for 5 min OR
- p95 latency > 1.5s for 5 min OR
- Any authz/OPA policy regression

Rollback = `helm rollback <release> <rev>` and revert flag set `feature.maestro_v2=false`

## Migration Gate
- DB schema changes gated behind `ops/migrations/LOCKED` toggle
- Apply on stage only after backup snapshot (PITR enabled)
- Promote to prod after 30 min healthy soak

## Observability
- OTEL traces enabled across services
- Prometheus alerts: SLO burn, 5xx spike, saturation
- Structured logs with release tag + git SHA

## Security & Compliance
- OPA policy checks green
- SBOM generated; provenance attested
- No secrets in repo/CI logs (sealed-secrets only)
