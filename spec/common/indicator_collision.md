# Indicator Collision & Alias Primitive

Defines the reusable logic for deconflicting indicators across feeds.

## Goals
- Detect collisions (same indicator, multiple objects) and aliases (multiple indicators, one object).
- Produce canonical indicator objects with collision annotations.
- Emit collision proofs under evidence and verification budgets.

## Techniques
- **Context Similarity**: compare malware families, actors, infrastructure, timestamps.
- **Provenance Similarity**: feed origin, reporting entity, sighting quality.
- **Graph Neighborhood Similarity**: hop-bounded neighborhood clustering in the intelligence graph.
- **Multi-modal Detection**: identify multi-modal context clusters per indicator value.

## Outputs
- Canonical indicator object composed of equivalence classes.
- Collision proof: minimal support set, Merkle-committed hashes, optional attestation quote.
- Safe action envelope describing allowed automation under uncertainty.
- Replay token combining index version, policy version, and time window identifier.
