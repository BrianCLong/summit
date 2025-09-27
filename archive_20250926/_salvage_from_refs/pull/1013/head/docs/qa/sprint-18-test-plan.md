# Sprint 18 Test Plan

## Subscriptions Soak Test
- Run `npm test` targeting `subscriptions_soak.test.ts`.
- Simulate 10× fan-out using mocked events.
- Verify p95 latency ≤300 ms and drop rate <0.5%.

## Backpressure
- Unit tests for `BackpressureGate` cover accept/shed paths.
- Metrics sampled via `subscriptions_metrics.ts`.

## Cache Coherency
- `coherency_e2e.test.ts` writes through cache, publishes invalidation, refetches fresh payload.

## Clean Room Policy
- `cleanrooms_policy.test.ts` validates manifest enforcement and residency/DLP gates.
- OPA policy loaded from `server/policies/cleanrooms.rego`.

## Non-Functional
- All tests run with network disabled.
- `make sprint18` aggregates coverage.
