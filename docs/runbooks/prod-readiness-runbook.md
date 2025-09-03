# Maestro Conductor Prod-Readiness (Dev/Build)

This runbook validates preconditions for Maestro in dev/build and documents the steps to flip canary safely.

## Preconditions

- Secrets: `maestro-secrets` (maestro-system), `pagerduty-routing-key` (monitoring)
- Argo Rollouts CRDs/controller installed
- Monitoring stack running (Prometheus/Alertmanager/Grafana)
- Blackbox exporter + ServiceMonitor applied

## Steps

1. Deploy Helm overlay (pins image sha, sets host)

- Script: `scripts/deploy-maestro-helm.sh` with `HOST` and `IMAGE_TAG` (sha-<GITHUB_SHA>)

2. Rollout canary and watch analysis

- `kubectl-argo-rollouts -n maestro-system get rollout maestro-server-rollout --watch`

3. k6 canary smoke

- `k6 run scripts/k6/conductor_canary_smoke.js -e BASE=https://<host>`

4. Alerting test

- `scripts/ops/readiness-check.sh` sends a TestPage alert via Alertmanager API

5. Dashboards

- Grafana: confirm service overview, rollout/canary, error budget panels populated

6. DR sanity

- `PGURL=... ./scripts/dr/restore_check.sh`

## CI Gate

- Readiness workflow `.github/workflows/readiness-check.yml` runs post-CD and fails if checks do not pass.

## Temporary Auth Stop-Gap (optional)

- Set `ENABLE_API_KEYS=1` and `API_KEYS`/`API_KEY` in `maestro-secrets` to allow admin API key via `X-API-Key` header.

## Acceptance Criteria

- Rollout completes with analysis passing
- PD receives incident from test alert
- SLO dashboards populated; blackbox metrics present
- DR restore_check passes
