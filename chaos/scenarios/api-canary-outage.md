# Chaos Scenario: API Canary Outage Containment

## Objective
Validate that the platform can withstand a sudden outage of the canary API pods without breaching the error budget or p95 SLOs.

## Hypothesis
If the canary pods for the public API are terminated, the gateway should reroute traffic to stable pods within 60 seconds and maintain p95 latency below 450ms with no sustained error budget burn (>1.0 for more than 5 minutes).

## Blast Radius
- **Target**: `maestro-api` canary deployment (20% traffic slice)
- **Scope**: Only pods labeled `role=canary`
- **Abort Conditions**: Error budget burn rate > 2.0 for 2 consecutive minutes or HTTP 5xx > 5%

## Execution Steps
1. Record baseline metrics for latency, error budget burn, and saturation for 10 minutes.
2. Use the chaos orchestrator to issue: `kubectl delete pod -l app=maestro-api,role=canary` in the staging cluster.
3. Maintain the disruption for 15 minutes while monitoring gateway failover and autoscaler behaviour.
4. Recreate canary pods via deployment rollout: `kubectl rollout restart deploy/maestro-api-canary`.

## Observability Hooks
- Dashboards: `grafana://maestro/api-latency`, `grafana://maestro/error-budget`
- Alerts muted: `maestro-api-canary-latency`, `maestro-api-5xx`
- Synthetic canary: `npm run smoke -- --tag=api-canary`

## Expected Results
- Failover completes in < 60 seconds with traffic draining to stable pods.
- Aggregate p95 latency remains < 450ms throughout the experiment.
- Error budget burn rate spikes < 1.0 for no longer than 2 minutes.
- No customer-visible downtime recorded by synthetic monitors.

## Evidence Collection
- Export Grafana panels as PNG and attach to the descriptor listed in `docs/acceptance-packs/collaborative-intelligence-epic.json`.
- Capture k6 load report (`load/reports/quality-gates.json`) for attachment to the acceptance pack archive that the release pipeline generates (ignored by git).
- Store chaos toolkit log output in `test-results/chaos/api-canary-outage.log`.

## Rollback & Recovery
- If abort conditions trigger, immediately scale canary deployment back to 3 pods and rerun health checks.
- Notify SRE on-call and log incident with severity SEV-2.
- Document findings in the release evidence bundle to prove resilience testing coverage.
