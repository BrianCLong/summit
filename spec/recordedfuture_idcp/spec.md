# Recorded Future — IDCP: Indicator Deconfliction with Collision Proofs

## Overview
IDCP canonicalizes indicators of compromise (IOCs) across feeds by detecting collisions and aliases. It outputs canonical indicator objects with collision proofs, safe action envelopes, and replay tokens.

## Architecture
- **Feed Collector**: ingests indicator records with context attributes.
- **Similarity Engine**: computes context, provenance, and graph-neighborhood similarity.
- **Collision Detector**: identifies multi-modal clusters indicating collisions for identical indicator values.
- **Canonicalizer**: builds canonical indicator objects with equivalence classes and collision annotations.
- **Proof Generator**: selects minimal support sets under proof budgets, computes Merkle roots, and prepares collision proofs plus safe action envelopes.
- **Deconfliction Artifact Emitter**: outputs artifact with replay token and registers it in transparency log.

## Data Contracts
- **Indicator record**: indicator_value, context attributes (timestamp, location, malware family, actor, infrastructure), provenance.
- **Deconfliction artifact**: canonical indicator object, collision annotations, collision proof, safe action envelope, replay token, attestation quote?.
