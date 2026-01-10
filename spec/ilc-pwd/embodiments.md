# Embodiments and Design-Arounds — ILC-PWD

## Alternative Embodiments

- **Evidence classes:** Provenance-weighted decay can differentiate sightings, exploit reports, remediation confirmations, and analyst attestations, each with distinct decay curves and trust modifiers.
- **Conflict detection:** Conflict measures may be derived from mutually exclusive claims, knowledge graph contradictions, or rules that detect incompatible indicators.
- **Lifecycle policy:** State transitions can be encoded in policy-as-code so that thresholds, hysteresis bands, and escalation rules are auditable and versioned.

## Implementation Variants

- **Support set selection:** Minimal support sets can be computed via greedy selection, proof budgets, or optimization that minimizes total bytes or verification time.
- **Caching:** Lifecycle states may be cached per entity with invalidation tied to policy version changes and evidence updates.
- **Counterfactual analysis:** Remediation scenarios can simulate evidence removal, confidence decay acceleration, or incident closure actions to estimate lifecycle impact.

## Design-Around Considerations

- **Policy gating:** Sensitive evidence can be summarized with commitments while maintaining transition proof integrity.
- **Time windows:** Replay tokens may encode evaluation windows to support rolling or retrospective analysis.
- **Audit trails:** Transition proofs can be anchored to immutable ledgers or transparency logs without changing the lifecycle semantics.
