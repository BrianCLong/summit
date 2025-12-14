# IntelGraph Monorepo Layout (Zero Coupling)

```bash
intelgraph/
  apps/
    gateway/           # Node/Express GraphQL
    ui/                # React + MUI + Cytoscape.js + jQuery helpers
  services/
    prov-ledger/
    policy-compiler/
    ai-nlq/
    er-service/
    ingest/
    zk-tx/
  ops/
    helm/
    k6/
    grafana/
  packages/
    sdk-js/
    sdk-py/
    contracts/        # PACT files
  tests/
    e2e/
  .github/
    workflows/
```
