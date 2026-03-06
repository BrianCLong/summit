# Summit Cognitive Terrain Engine (Phenomenology Layer)

This module establishes a governed **phenomenology layer** for Summit so analysts can model
how reality is perceived (belief, emotional salience, trust, identity resonance), not only what
entities and events exist.

## Summit Readiness Assertion

This design extends the existing ontology graph with a deterministic perception graph:

`NarrativeFrame -> BeliefState -> PerceivedReality -> BehaviorSignal`

The extension is intentionally constrained to additive schemas and deterministic transforms so the
golden path remains deployable.

## MAESTRO Alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: Prompt injection in extraction, narrative poisoning, adversarial bot
  amplification, drift spoofing.
- **Mitigations**: source provenance requirements, confidence scoring, deterministic evidence
  budgets, temporal drift thresholding, audit-friendly typed outputs.

## Files

- `narrative-model.ts`: shared data contracts for narratives, beliefs, and drift vectors.
- `belief-extractor.ts`: deterministic extraction helpers for post -> belief candidates.
- `perception-graph.ts`: graph edge construction for phenomenology traversal.
- `drift-detector.ts`: time-series drift scoring and alerting logic.

## Operational Contract

1. No open-ended retrieval paths; all traversals require explicit limits.
2. Every derived belief record carries confidence and evidence metadata.
3. Drift alerts must be reversible and recomputable from immutable snapshots.
4. Production rollout gates require policy and evidence artifacts in CI.
