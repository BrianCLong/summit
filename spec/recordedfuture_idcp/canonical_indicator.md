# Canonical Indicator Object

## Structure
- Equivalence classes of indicators representing the same underlying object.
- Collision annotations for indicator values mapping to multiple objects.
- Safe action envelope specifying allowable automated actions under collision risk.
- Collision proof: minimal support set hashes, Merkle root, verification budget, attestation quote?, replay token (index version, policy version, time window).

## Lifecycle
- Cached by indicator value and replay token for reuse.
- Registered into transparency log for auditability.
- Supports counterfactual deconfliction excluding feeds to assess collision rate impact.
