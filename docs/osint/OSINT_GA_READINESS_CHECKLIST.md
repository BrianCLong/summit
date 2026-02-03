Owner: @intelgraph/osint-team
Last-Reviewed: 2026-01-29
Evidence-IDs: none
Status: active
ILSA-Level: 3
IBOM-Verified: true

# OSINT GA Readiness Checklist

## Code & Schema Instantiation
- [ ] **Stateful Collection:** Schema `collection_state.schema.json` is active and utilized by collectors.
- [ ] **Claim Graph:** Schema `claim_graph.schema.json` is used for all analytic outputs.
- [ ] **Evidence Linking:** Every `Claim` node has a non-null `evidencePointers` array.
- [ ] **Contradiction Exposure:** The `contradictions` field is populated by the conflict detection engine.

## Pipeline & Automation
- [ ] **Contradiction Gate:** CI pipeline fails if `scripts/ci/verify_contradiction_exposure.mjs` detects schema regression.
- [ ] **Explainability Gate:** No analytic output is published without full lineage trace (Collection -> Claim -> Confidence).
- [ ] **Failure Logging:** "What was not found" (403s, Blocks) is persisted in the ledger, not discarded.

## Governance & Ethics
- [ ] **Inference Limits:** Max hop count for inferences is enforced (Control `OSINT-003`).
- [ ] **Bias Mitigation:** UI displays evidence alongside scores (Control `OSINT-002`).
- [ ] **Confidence Versioning:** Updates to confidence scores append to `confidenceHistory`, preserving the previous values.
