# World-Model GA Readiness

**Workflow:** `.github/workflows/_reusable-ga-worldmodel.yml`

## GA Criteria

| Criterion | Target | Status |
|---|---|---|
| Prediction accuracy delta | +25% | pending eval |
| Planning success rate delta | +30% | pending eval |
| RAG grounding delta | +20% | pending eval |
| Security audit | pass | pending |
| `WORLD_MODEL_ENABLED` in prod | `false` | confirmed |

## PR Stack Merge Order

1. PR1 — evidence schemas
2. PR2 — observation pipeline
3. PR3 — representation layer
4. PR4 — state model
5. PR5 — dynamics model
6. PR6 — planning engine
7. PR7 — API exposure

## Required CI Checks

- `ci-core`
- `ci-verify`
- `ci-security`
- `ci-worldmodel`

## Rollback

```
WORLD_MODEL_ENABLED=false
```

Full removal: delete `src/agents/world_model/`, `src/graphrag/world_model/`,
`src/api/graphql/world_model_resolver.ts`, `src/connectors/observation_pipeline.ts`.
