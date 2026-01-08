# Meta Orchestrator Plug-in Architecture

This package now exposes composable plug-in hooks that wrap planning and execution. Plug-ins can be used to add custom observability, policy controls, or experimental “Black Projects” modules without modifying the core scheduler.

## Lifecycle Hooks

| Hook             | Timing                                           | Suggested Uses                                                                                      |
| ---------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `beforePlan`     | Right before a plan is generated.                | Enforce pre-flight controls, inject governance tags, attach lineage metadata.                       |
| `afterPlan`      | Immediately after plan creation.                 | Publish explainability bundles, update dashboards, record risk attestations.                        |
| `beforeStage`    | Prior to executing each stage.                   | Configure per-stage feature flags, register circuit breakers, or route data to specialized modules. |
| `afterStage`     | After each stage completes (success or failure). | Emit telemetry, apply cost/latency caps, trigger adaptive retries.                                  |
| `afterExecution` | After the full pipeline completes.               | Send compliance attestations, archive sessions, or trigger downstream playbooks.                    |

## Implementing a Plug-in

```ts
import type { MetaOrchestratorPlugin } from "@ga-graphai/common-types";

export const blackProjectsProbe: MetaOrchestratorPlugin = {
  name: "black-projects-probe",
  async beforePlan(ctx) {
    console.log("capturing context", ctx.metadata);
  },
  async afterExecution(ctx) {
    // Ship replay bundle or trigger AI governance checks
  },
};
```

Register plug-ins when constructing the orchestrator:

```ts
new MetaOrchestrator({
  pipelineId: "edge-lab",
  providers,
  pricingFeed,
  execution,
  auditSink,
  plugins: [blackProjectsProbe],
});
```

## Extension Points for Future Modules

- **Capability Matrix**: Feed richer performance/cost/latency telemetry to bias routing toward experimental modules.
- **Decision Policies**: Add domain-specific decision trees to steer urgent or sensitive data to hardened modules.
- **Session Archiver**: Persist full replay descriptors to distributed storage for red/blue-team exercises.
- **Governance Trail**: The orchestrator emits normalized governance events suitable for downstream explainability or bias audits.

These surfaces are stable entry points intended for “Black Projects” experimentation while preserving auditability and rollback readiness.
