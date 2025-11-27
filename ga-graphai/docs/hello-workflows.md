# Reference "Hello" Workflows

These scenarios exercise the full IntelGraph orchestrator path — planning, execution, self-healing, and graph updates — with repeatable fixtures developers can run locally or in CI.

## Hello-World (golden path)

- **Entry point:** `runHelloWorldWorkflow` in `packages/meta-orchestrator/src/index.ts`.
- **What it covers:** hybrid planner scoring, pricing-aware selection, audit logging, and knowledge-graph ingestion for the `svc-hello-world` service.
- **Topology:** single build/deploy stage targeting Azure (primary) with AWS as a guarded fallback; runs in the `env-dev` environment with PCI policies attached.
- **Expected signals:** plan narrative, full audit trace, graph nodes for service/pipeline/environment, and a low-cost, low-risk risk profile.

## Hello-Case (resilient path)

- **Entry point:** `runHelloCaseWorkflow` in `packages/meta-orchestrator/src/index.ts`.
- **What it covers:** failure handling, fallback execution, reward shaping, and IntelGraph risk surfacing driven by incidents, cost pressure, and policy bindings for `svc-hello-case`.
- **Topology:** ML-capable stage planned on Azure that intentionally fails, triggering AWS fallback with self-healing enabled; attaches FedRAMP policies and production zero-trust environment context.
- **Expected signals:** recovered execution trace, self-healing telemetry, elevated service risk (incident + cost), and audit events spanning plan, fallback, and execution.

## Running the workflows

- **Package tests:**
  - `cd packages/meta-orchestrator && npm test` — full vitest suite including both reference workflows.
  - `npm run smoke` — workspace smoke pass (Hello-World reference flow only).
  - `npm run load` — workspace load pass (Hello-Case repeated orchestration with fallback).

## Post-deploy validation

- The `.github/workflows/post-deploy-tests.yml` workflow triggers on successful deployments, re-runs the smoke and load commands, and posts their status as PR comments for any commit tied to the deployment.
