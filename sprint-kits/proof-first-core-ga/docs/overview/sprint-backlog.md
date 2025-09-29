# Sprint Backlog (Issues)

| Key | Title                                          | Stack        | Estimate (SP) | Owner        |
| --- | ---------------------------------------------- | ------------ | ------------- | ------------ |
| A-1 | Implement `/evidence/register`                 | Go           | 5             | Backend      |
| A-2 | Transform recorder middleware                  | Go           | 3             | Backend      |
| A-3 | Export `hash-manifest.json` (Merkle)           | Go           | 5             | Backend      |
| A-4 | `prov-verify` CLI with diffing                 | Go           | 5             | Tools        |
| A-5 | Export blocker policy evaluation               | Go           | 5             | Backend      |
| B-1 | `nl_to_cypher` module + schema prompt composer | TS           | 8             | AI/FE        |
| B-2 | Cost estimator & preview panel                 | TS           | 5             | FE           |
| B-3 | Sandbox executor + undo/redo                   | TS           | 5             | FE           |
| B-4 | Corpus + tests to ≥95% syntax validity         | TS           | 5             | QA/AI        |
| C-1 | Blocking + candidate generation                | Go           | 5             | Backend      |
| C-2 | `/er/merge` reversible merges + audit log      | Go           | 5             | Backend      |
| C-3 | `/er/explain` features + rationale             | Go           | 3             | Backend      |
| C-4 | Golden fixtures `er/golden/*.json`             | Data         | 3             | Data         |
| D-1 | OTEL traces + Prom metrics emitters            | Go           | 5             | Platform     |
| D-2 | Dashboards JSON (p95, errors, CostGuard)       | Ops          | 3             | Platform     |
| D-3 | Cost Guard plan budget + killer                | Go           | 5             | Platform     |
| D-4 | k6 load scripts + alert wiring                 | Ops          | 5             | Platform     |
| E-1 | Tri-pane shell & routing `/case/:id/explore`   | TS           | 5             | FE           |
| E-2 | Sync brushing across panes                     | TS           | 5             | FE           |
| E-3 | Explain overlay + provenance tooltips          | TS           | 5             | FE           |
| E-4 | Cypress benchmarks + screenshot diffs          | TS           | 3             | QA/FE        |
| F-1 | RSS/News connector w/ manifest & tests         | Integrations | 5             | Integrations |
| F-2 | STIX/TAXII connector                           | Integrations | 5             | Integrations |
| F-3 | CSV ingest wizard + PII flags                  | Integrations | 5             | Integrations |
