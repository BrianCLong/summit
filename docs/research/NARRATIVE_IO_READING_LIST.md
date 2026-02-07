# Narrative IO Reading List

This reading list anchors the Narrative IO program to governed references and aligned evidence
requirements. It is curated to support the feature registry in
`docs/research/FEATURES_FRAME_CIB.yml` and the CIB policy gate in
`policy/cib/feature_registry.rego`.

## Core References (Required)

1. **Frame Semantics & Moral Foundations**
   - Establishes value frame taxonomies and moral evaluation signals used by `FRAME.VALUE` and
     `FRAME.MORAL_EVAL`.
2. **Causal Attribution in Narrative**
   - Supports deterministic extraction for `FRAME.CAUSAL_ATTRIBUTION` with explicit causal triples.
3. **Rhetorical Evidentiality & Certainty**
   - Grounds evidentiality markers and certainty scoring for `RHETORIC.EVIDENTIALITY`.
4. **Scapegoating & Outgroup Attribution**
   - Defines blame targeting patterns used by `RHETORIC.SCAPegoating`.
5. **Coordinated Inauthentic Behavior (CIB) Methodology**
   - Baseline for temporal sync, text reuse, URL reuse, and network cohesion.
6. **Cross-Platform Influence Linkage**
   - Provides canonical linking and fingerprinting guidance for `CIB.CROSSPLATFORM.LINKAGE`.
7. **Explainability & Auditability Standards**
   - Governs explanation spans (`EXPLAIN.SPAN`) and evidence bundle integrity.

## Evidence & Governance Notes

- All narrative/CIB work must surface evidence IDs aligned to the feature registry and policy
  minimums, including `EV-CIB-001`, `EV-CIB-002`, `EV-CIB-004`, `EV-XPLAT-001`, and `EV-EXP-001`.
- Evidence bundles are the authoritative output; summaries must reference evidence artifacts.
- Updates to this list require a matching update to `docs/research/FEATURES_FRAME_CIB.yml` and
  `policy/cib/feature_registry.rego` to maintain governance consistency.
