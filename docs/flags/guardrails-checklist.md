# Guardrails Checklist

Production-readiness checklist for feature flags and guardrails protecting high-risk user-facing actions.

Ref: [Flag wiring & guardrails #11015](https://github.com/BrianCLong/summit/issues/11015)

## Flag Inventory

| Flag Key | Scope | Risk | Default | Kill Switch | Risk Mitigated | CI Validation |
|---|---|---|---|---|---|---|
| `feature.investigation.bulk-operations` | global/tenant | high | `false` | yes | Mass data mutation; accidental bulk delete/update across entities | Set `FLAG_FEATURE_INVESTIGATION_BULK_OPERATIONS=false` and assert bulk endpoints return 403 |
| `feature.investigation.delete` | global/tenant | high | `false` | yes | Irreversible investigation deletion; data loss | Set `FLAG_FEATURE_INVESTIGATION_DELETE=false` and assert `deleteInvestigation` mutation returns FORBIDDEN |
| `feature.investigation.export` | global/tenant | medium | `false` | yes | Data exfiltration via report export; classification leakage | Set `FLAG_FEATURE_INVESTIGATION_EXPORT=false` and assert export endpoints are gated |
| `feature.osint.ingestion` | global/tenant | high | `false` | yes | Unvetted external data entering the graph; poisoned source injection | Set `FLAG_FEATURE_OSINT_INGESTION=false` and assert ingestion endpoints reject payloads |
| `feature.osint.enrichment` | global/tenant | high | `false` | yes | Automated enrichment calling external APIs; cost/privacy risk | Set `FLAG_FEATURE_OSINT_ENRICHMENT=false` and assert enrichment pipelines are gated |
| `feature.graph.cross-tenant-visibility` | global/tenant | high | `false` | yes | Cross-tenant data leakage in shared graph views | Set `FLAG_FEATURE_GRAPH_CROSS_TENANT_VISIBILITY=false` and assert tenant isolation holds |

## Pre-existing Guardrails (confirmed)

| Guardrail | Location | What it Protects |
|---|---|---|
| `authGuard` (GraphQL) | `server/src/graphql/utils/auth.js` | All mutations require authentication + permission (e.g., `write:case`) |
| `graphql-shield` permissions | `server/src/graphql/permissions.ts` | Query/Mutation access: public vs authenticated vs admin |
| Tenant isolation (store) | `server/src/investigations/store.ts` | All CRUD ops validate `tenantId`; cross-tenant access returns empty/throws |
| Tenant isolation (workflow) | `server/src/services/investigationWorkflowService.ts` | `advanceWorkflowStage`, `addEvidence`, `addFinding`, `addTimelineEntry` all check `tenantId` |
| RBAC (realtime) | `server/src/realtime/investigationAccess.ts` | Role-based permission matrix: owner/editor/commenter/viewer per investigation |
| PII guardrail (LLM) | `server/src/services/llm/guardrails/PIIGuardrail.ts` | Redacts SECRET_KEY patterns from LLM request/response |
| NL2Cypher guardrails | `services/gateway/src/nl2cypher/guardrails/` | Constrains generated Cypher to prevent injection/exfiltration |
| Budget guard (conductor) | `services/conductor/src/budget/guard.ts` | Prevents cost overruns in orchestration pipelines |
| `feature.policy-guard` flag | `flags/catalog.yaml` | Kill-switch for policy enforcement engine |
| `feature.qos.override-api` flag | `flags/catalog.yaml` | Kill-switch for QoS override API (high-risk) |

## New Flag-Gated Guardrails (this PR)

### `feature.investigation.delete`

- **Wired in**: `server/src/graphql/resolvers/investigation.ts` via `flagGuard()` wrapping the `deleteInvestigation` mutation
- **Behavior when OFF**: Returns `GraphQLError` with code `FORBIDDEN` and message referencing the flag key
- **Behavior when ON**: Delegates to existing `authGuard('write:case')` resolver
- **Env override**: `FLAG_FEATURE_INVESTIGATION_DELETE=true|false`

### `feature.investigation.bulk-operations`

- **Catalog entry**: Registered with kill-switch, default OFF, canary steps [0, 10, 25, 50, 100]
- **Status**: Flag registered; resolver wiring pending bulk operation endpoint implementation
- **CI validation**: Verify flag defaults to false in prod targets

### `feature.investigation.export`

- **Catalog entry**: Registered with kill-switch, default OFF
- **Status**: Flag registered; export endpoint not yet implemented
- **CI validation**: Verify flag defaults to false in prod targets

### `feature.osint.ingestion` / `feature.osint.enrichment`

- **Catalog entries**: Both registered with kill-switches, default OFF, conservative canary ramp
- **Status**: Flags registered; ingestion/enrichment service integration pending
- **CI validation**: Verify flags default to false in prod targets

### `feature.graph.cross-tenant-visibility`

- **Catalog entry**: Registered with kill-switch, default OFF, NOT enabled in prod environment
- **Status**: Flag registered; graph query layer integration pending
- **CI validation**: Verify flag defaults to false and is absent from prod environments list

## How to Validate in CI

### Quick smoke test (runs in unit-test phase)

```bash
# Verify all new flags default to OFF in prod
node -e "
  const catalog = require('./flags/catalog.yaml');
  // Or parse with js-yaml
  const fs = require('fs');
  const targets = JSON.parse(fs.readFileSync('flags/targets/prod.yaml', 'utf8'));
  const highRisk = [
    'feature.investigation.bulk-operations',
    'feature.investigation.delete',
    'feature.investigation.export',
    'feature.osint.ingestion',
    'feature.osint.enrichment',
    'feature.graph.cross-tenant-visibility',
  ];
  for (const key of highRisk) {
    const flag = targets.flags[key];
    if (!flag || flag.value !== false || flag.percentage !== 0) {
      console.error('FAIL: ' + key + ' is not OFF in prod');
      process.exit(1);
    }
  }
  console.log('All high-risk flags are OFF in prod targets');
"
```

### E2E guardrail test

```bash
# Run the guardrails negative-path suite
pnpm test:e2e -- --grep "guardrails"
```

### Flag guard unit test

```bash
# Run the flagGuard unit test
pnpm -w test -- --testPathPattern="flagGuard"
```

## Rollout Strategy

1. **Dev**: All flags ON at 100% for testing
2. **Stage**: Gradual rollout (25-75%) with salt-based consistent hashing
3. **Prod**: All new flags OFF (percentage 0) until explicit promotion via canary pipeline
4. **Kill switch**: All high-risk flags have `kill_switch: true` allowing instant disable via file or remote provider

## Expiration

All new flags expire `2026-06-30`. They must be either:
- Promoted to permanent (converted to standard permission checks), or
- Removed if the feature is stable
