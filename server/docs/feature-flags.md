# Runtime Feature Flags with OPA

This guide explains how to evaluate runtime feature flags, propagate request context, and trigger emergency kill switches using the OPA-backed SDK.

## Quick start

```bash
# Evaluate a flag
pnpm --filter intelgraph-server feature-flags ai.reranker

# Evaluate a flag and module kill switch together
pnpm --filter intelgraph-server feature-flags ai.reranker maestro-pipeline
```

## SDK usage

```ts
import { featureFlagClient, buildContextFromRequest } from '../feature-flags/index.js';

const context = buildContextFromRequest(req);
const { decision } = await featureFlagClient.evaluateFlag('ai.reranker', context);

if (decision.enabled) {
  // execute gated behavior
}
```

## Kill switch guard middleware

```ts
import { killSwitchGuard } from '../middleware/kill-switch.js';

app.post('/risky', killSwitchGuard('risky-module'), handler);
```

## Observability

- Metrics: `feature_flag_decisions_total`, `feature_flag_evaluation_duration_seconds`, `feature_kill_switch_active`.
- Grafana dashboard: `server/grafana/feature-flags.json` ships with burn-down and latency views.
- Audit logging: every evaluation emits structured logs with evaluation IDs, trace IDs, and correlation IDs.

## Policy authoring

OPA rego lives in `server/policies/feature_flags.rego`. Policies can express:

- Context-aware enables (tenant, role, environment)
- Module kill switches with audit metadata
- Fine-grained risk gates for risky routes or tenants
