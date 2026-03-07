# Summit Intelligence Architecture Standards

## Interop & Standards Mapping

| Domain | Import | Export |
| :--- | :--- | :--- |
| **Company Graph** | company entities, aliases, links | company capability summaries |
| **Marketplace Index** | marketplace tools, providers, source claims | tool index, ecosystem views |
| **ACG** | capability taxonomy, assignments, projections | company/tool/capability graph slices |
| **ACD** | discovery signals, clusters, novelty proposals | proposal artifacts, drift reports |

## Non-goals
- tool execution
- billing/procurement workflows
- enterprise seat management
- model hosting
- autonomous merge of taxonomy changes

## Standards
- Evidence ID required on all externally grounded assertions.
- Deterministic `report.json`, `metrics.json`, `stamp.json`.
- Additive schema evolution only.
- Source provenance included on every discovery candidate.
