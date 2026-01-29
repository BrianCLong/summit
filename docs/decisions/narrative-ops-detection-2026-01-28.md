# Decisions — Narrative Ops Detection (2026-01-28)

## Decisions Made
- Implemented subsumption bundle as foundation: manifest + schemas + CI verifier.
- Added deny-by-default policy fixtures to prevent unsafe attribution language.
- Added eval smoke harness with deterministic metrics outputs (toy dataset).

## Alternatives Rejected
- Shipping ML models in GA baseline (deferred: footprint + supply chain).
- Real-time cross-platform ingestion integration (deferred: scope).

## Deferred Items
- Hybrid scoring implementation (graph+semantic) — backlog YAML.
- Temporal cascade modeling — backlog YAML.

## Risk Tradeoffs
- Innovation module is feature-flag OFF by default.

## GA Alignment
- No runtime behavior change required for GA; gates are additive.
