# Reference "Hello" Workflows

These reference flows exercise the full orchestrator surface area while walking IntelGraph through service, pipeline, and policy context. They are intended as executable documentation for integrators and for the post-deploy smoke/load checks.

## Hello-World (happy path)
- **Graph coverage:** seeds a dev pipeline, service, dependency, environment, and FedRAMP policy so IntelGraph renders `service`, `pipeline`, and `policy` nodes plus `CONTAINS`, `TARGETS`, and `DEPENDS_ON` edges.
- **Orchestrator coverage:** runs the `hello-world-stage` through cost-optimized planning, executes on the Azure primary, and emits audit entries for the plan and execution while producing telemetry (throughput and audit completeness).
- **Execution knobs:** 90+ TPM minimum, 15-minute SLA, 5% max error rate with a dev compliance envelope.

## Hello-Case (fallback and risk)
- **Graph coverage:** stages a staging pipeline with HIPAA/PCI compliance tags, a critical service, open incident, and cost signal to push IntelGraph risk scoring above baseline.
- **Orchestrator coverage:** plans with explicit fallbacks, forces the Azure primary to fail, self-heals via the AWS fallback, and records fallback plus reward-update audit entries with non-zero self-healing telemetry.
- **Execution knobs:** 140 TPM minimum, 10-minute SLA, 5% guardrail, and fallback eligibility on execution failures.

## How to validate locally
1. `cd ga-graphai/packages/meta-orchestrator`
2. `npm test`

The `referenceWorkflows.test.ts` suite runs both flows end-to-end, asserting the orchestrator trace, audit events, IntelGraph connectivity, and risk outputs.

## Post-deploy signals
- The `post-deploy-verification.yml` workflow runs smoke and load (k6) checks after every deploy workflow completes and posts the resulting status back to the originating PR (when available).
- Endpoints are derived from the deployment target (dev/staging/prod) and the workflow will fail fast if required URLs are not provisioned.
