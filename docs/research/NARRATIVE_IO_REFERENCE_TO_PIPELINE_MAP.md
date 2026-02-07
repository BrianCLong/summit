# Narrative IO Reference → Pipeline Map

## Purpose
Provide a deterministic mapping from narrative IO reference artifacts to pipeline stages, ensuring
feature registry definitions, evidence bundles, and OPA policy gates stay synchronized.

## Mapping table

| Reference artifact | Pipeline stage | Output artifact | Evidence anchor |
| --- | --- | --- | --- |
| `docs/research/FEATURES_FRAME_CIB.yml` | Signal catalog + thresholds | Feature registry outputs | Evidence IDs `EV-*` per signal |
| `policy/cib/feature_registry.rego` | Policy gate evaluation | `data.summit.cib.allow` + reasons | `EV-CIB-*`, `EV-XPLAT-001`, `EV-EXP-001` |
| `policy/cib/policy_test.rego` | Determinism verification | OPA test results | Test logs (gate-specific) |
| Narrative analysis briefs in `docs/research/narrative_analysis_*.md` | Analyst baseline + labeling guidance | Gold labels / annotations | Evidence bundle artifacts |
| `docs/research/ARTIFACT_STANDARDS.md` | Evidence bundling | Evidence bundle schema | Evidence bundle index |

## MAESTRO alignment
- **Layers**: Data, Agents, Tools, Observability, Security.
- **Threats considered**: prompt injection in LLM tagging, coordination spoofing, evidence tampering.
- **Mitigations**: evidence ID minimums, deterministic thresholds, policy gate denials, audit-ready
  explanation spans.

## Operational notes
- Any change to signals or policy thresholds must update the feature registry and policy gate in
  the same PR.
- Evidence IDs are authority-aligned; do not introduce new IDs without updating governance indexes.
