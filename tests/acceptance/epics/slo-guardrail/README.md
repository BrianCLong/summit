# Epic Acceptance Pack – SLO Guardrails

## Context
This epic hardens the health and graph gateway guardrails so that analysts never experience degraded response times without automated rollback. Acceptance criteria require observability budgets, circuit breaker behavior, and chaos drills to ship together.

## Acceptance Criteria Mapping
| AC | Description | Automated Evidence |
| --- | --- | --- |
| AC1 | Health endpoint p95 ≤ 300 ms under nominal load | Playwright `server/tests/e2e/health-slo.spec.ts`, k6 `tests/load/health-p95.k6.js` |
| AC2 | Circuit breaker prevents cascading failures | Jest `server/src/utils/__tests__/CircuitBreaker.test.ts`, chaos probe `tests/chaos/control-plane-latency-experiment.yaml` |
| AC3 | Evidence bundle archived with latency + coverage | `tests/acceptance/epics/slo-guardrail/evidence.yaml`, SBOM + policy simulation |

## Execution
Run `bash scripts/ci/run-quality-gates.sh --epic slo-guardrail`. CI collects artefacts described in `evidence.yaml` and publishes to `artifacts/acceptance/slo-guardrail/`.

## Manual Fallback
If automation is unavailable:
1. Manually run `pnpm --filter server test -- CircuitBreaker`.
2. Execute `k6 run tests/load/health-p95.k6.js --vus 20 --duration 2m` and capture summary.
3. Record the chaos experiment result from Litmus UI, attach screenshot to evidence pack.
