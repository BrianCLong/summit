# Narrative IO Reference → Pipeline Map

This map ties governed references to pipeline stages, signals, and evidence IDs. It aligns the
narrative/CIB registry with the OPA policy gate and evidence bundle expectations.

## Mapping Table

| Reference Area | Pipeline Stage | Registry Signals | Evidence IDs | Outputs |
| --- | --- | --- | --- | --- |
| Frame semantics & moral foundations | Content analysis | `FRAME.VALUE`, `FRAME.MORAL_EVAL` | `EV-FRAME-001`, `EV-FRAME-003` | Labels, spans, polarity |
| Causal attribution | Content analysis | `FRAME.CAUSAL_ATTRIBUTION` | `EV-FRAME-002` | Causal triples |
| Rhetorical evidentiality | Rhetoric analysis | `RHETORIC.EVIDENTIALITY` | `EV-RHET-001` | Markers, certainty |
| Scapegoating & outgroup blame | Rhetoric analysis | `RHETORIC.SCAPegoating` | `EV-RHET-002` | Targets, confidence |
| Remedies & prescriptions | Content analysis | `FRAME.REMEDY` | `EV-FRAME-004` | Remedies, confidence |
| Temporal synchronization | Behavior analysis | `CIB.TEMPORAL.SYNC` | `EV-CIB-001` | Sync score, clusters |
| Text reuse | Behavior analysis | `CIB.TEXT.REUSE` | `EV-CIB-002` | Reuse edges, reuse score |
| URL reuse | Behavior analysis | `CIB.URL.REUSE` | `EV-CIB-003` | URL graph stats |
| Network cohesion | Graph analysis | `CIB.NETWORK.COHESION` | `EV-CIB-004` | Communities, cohesion score |
| Account similarity | Account analysis | `CIB.ACCOUNT.SIMILARITY` | `EV-CIB-005` | Similarity score, clusters |
| Cross-platform linkage | Cross-platform stitching | `CIB.CROSSPLATFORM.LINKAGE` | `EV-XPLAT-001` | X-plat edges, cluster score |
| Campaign phase | Temporal analysis | `CIB.CAMPAIGN.PHASE` | `EV-CAMP-001` | Phase, change points |
| Explainability spans | Audit/Explainability | `EXPLAIN.SPAN` | `EV-EXP-001` | Spans, rationale |

## Governance Alignment

- Policy gate: `policy/cib/feature_registry.rego`
- Feature registry: `docs/research/FEATURES_FRAME_CIB.yml`
- Evidence minimums: `POLICY.EVIDENCE_MINIMUMS`

## Output Discipline

- Every pipeline run must emit evidence IDs used by policy evaluation.
- Evidence bundles are authoritative; narrative outputs must remain traceable to evidence IDs.
