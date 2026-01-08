# Golden Paths Runbook

## Purpose

Synthetic probes validate end-to-end user journeys and enforce SLOs. This runbook explains how to run probes, interpret dashboards, and react to failures across preview, stage, and prod.

## Journeys

See `observability/golden_paths.yaml` for the authoritative catalog. Each journey defines steps, expected responses, required span attributes, and p95 budgets.

## Operating the probe

1. Install dependencies: `pip install -r tools/synth-probe/requirements.txt`.
2. List journeys: `python -m probe list --catalog observability/golden_paths.yaml`.
3. Run a journey: `python -m probe run --journey GP-001 --base https://env.example.com --tenant preview --samples 1 --export prometheus`.
4. Metrics are exposed on `:9464` when `--export prometheus` is used.
5. OTEL export honors `OTEL_EXPORTER_OTLP_ENDPOINT`, `GIT_SHA`, `DEPLOY_ENV`, `K8S_NAMESPACE`, and `PR_NUMBER`.

Exit codes: `0` success, `2` step failure, `3` SLO breached, `4` config error.

## Dashboards

Grafana dashboard: `observability/grafana/dashboards/golden-paths.json`.

Key panels:

- p95 latency per step (histogram_quantile over `gp_step_latency_seconds`)
- Journey success ratio
- Recent step failures with links to Tempo/Jaeger traces

## Alerts

Alert rules consume `gp_step_errors_total` and success ratio. Burn-rate alerts align to journey error budget policies. Stage failures block promotion via `.ci/scripts/verify_goldens.sh` integration (Epic 01 hook).

## Common fixes

- Missing trace context: ensure gateway middleware `apps/gateway/src/middleware/otel.ts` is registered before routers.
- Missing span attributes: web client should import `initOtel` from `apps/web/src/lib/otel-client.ts` and add `x-journey-id`/`x-journey-step` headers on key calls.
- Probe errors in production: verify test tenant permissions and throttle using CronJob `synthProbe.schedule` values.

## Escalation

- Stage: page on-call if a journey fails twice in 10 minutes.
- Prod: open incident, capture failing trace links from Grafana, and validate against `observability/golden_paths.yaml` budgets.

## Change management

- Add new steps in `observability/golden_paths.yaml` with p95 and error budget details.
- Update CronJob cadence in `deploy/helm/intelgraph/templates/synth-probe-cron.yaml`.
- Keep dashboards in sync; PRs must include updated JSON if metrics change.
