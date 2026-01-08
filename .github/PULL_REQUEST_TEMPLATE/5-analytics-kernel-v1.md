# Graph Analytics Kernel (paths/community/centrality)

## Scope

- Service: services/graph-analytics
- GraphQL: analytics/\* job endpoints with tickets

## Acceptance Criteria

- Shortest/K-paths; Louvain/Leiden; betweenness/eigenvector
- Reproducibility (seeded) + explainability payloads
- Load-test N=50k nodes meets perf SLOs

## Test Plan

- Synthetic benchmark graph fixtures + tolerance bands
