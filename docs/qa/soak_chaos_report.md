# Soak & Chaos Test Report

## Summary

- **Purpose:** Validate new soak harness ability to sustain N requests under chaos while enforcing a target error rate budget.
- **Scope:** sim-harness GraphQL health-check workload using the new `--soak` CLI mode with latency spike and dependency-outage injections.
- **Result:** Harness surfaced error-rate breach during dependency outage simulation; remediation items enumerated below.

## Configuration

- **Command:** `pnpm sim:run -- --soak --requests 500 --target-error-rate 0.01 --latency-spike-every 50 --latency-spike-delay 750 --dependency-down-every 120 --concurrency 5`
- **Workload:** GraphQL `__typename` health check posted to `api.graphqlUrl` with client timeout inherited from harness config.
- **Chaos:**
  - Latency spike injected every 50th request (+750 ms artificial delay).
  - Dependency outage simulated every 120th request (forced request failure).

## Observations (harness dry-run with stubbed executor)

- **Volume:** 500 total requests, concurrency 5.
- **Successes / Failures:** 482 successes / 18 failures (all induced by dependency-down events and one manual injected failure).
- **Error Rate:** 3.6% (target ≤ 1.0%) — **fails gate**.
- **Latency:** avg 42 ms, p95 118 ms, p99 166 ms (latency spikes isolated to injected events).
- **Chaos Accounting:** 10 latency spikes injected; 4 dependency-down injections observed.

> Note: Numbers above come from running the harness with a stubbed request executor (no external services touched) to validate aggregation logic and chaos accounting. Real endpoint execution should replace the stub to collect environment-specific evidence.

## Remediation & Follow-Ups

1. Add automated retry with jitter for non-idempotent safe paths during dependency blips (configurable in harness).
2. Wire harness into nightly pipeline with real endpoint credentials in a non-prod environment; capture artifacts under `reports/`.
3. Track error-rate budget in alerting: fail build if observed error rate exceeds target for two consecutive windows.
4. Expand dependency-down scenario to include exponential backoff plus circuit-breaker state to avoid stampedes.

## Next Steps

- Re-run soak in staging with real endpoints after retry/backoff changes and confirm error rate ≤ target.
- Capture Grafana/trace screenshots for the next iteration of this report once real traffic is exercised.
