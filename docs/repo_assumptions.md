verified:
  - ci.yml exists
  - repo uses observability/metrics
  - metrics include intelgraph_active_connections
  - governance drift checks exist

assumed:
  - docs/watchlists/, docs/standards/, scripts/watchlists/, artifacts/watchlists/ are acceptable paths
  - JSON artifact conventions align with existing Summit subsumption bundles

must_not_touch:
  - existing branch protection / governance policy definitions
  - shared observability facade
  - release determinism policy surfaces unless explicitly needed
