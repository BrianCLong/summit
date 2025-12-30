# Claims – ILC-PWD

## Independent Claims

1. **Method:** Retrieve evidence from telemetry and open-source feeds; compute aggregate confidence using provenance-weighted decay; determine lifecycle state (NEW, ACTIVE, RETIRED) using confidence and conflict measures; generate transition proof with minimal support set; output lifecycle update artifact with state, proof, and replay token.
2. **System:** Evidence aggregator (provenance-weighted decay), lifecycle state engine, proof generator, and artifact store persisting lifecycle update artifacts with replay tokens.

## Dependent Variations

3. Contradiction score from mutually exclusive claims as conflict measure.
4. Per-evidence-class decay parameters (exploit, sighting, remediation).
5. Counterfactual impact of remediation actions included in artifact.
6. Minimal support set constrained by proof budget (items/bytes/verification time).
7. Replay token includes policy and index versions for determinism.
8. Signed policy decision token binding subject/purpose to evidence access.
9. Merkle commitment to evidence item hashes.
10. Caching lifecycle states keyed by entity and replay token components.
11. Egress budget enforcement with redacted evidence bytes.
12. State stability derived from confidence variance over time.
