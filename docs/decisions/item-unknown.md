# Decisions — item-unknown

## Decision
Ship subsumption bundle framework without ITEM-specific claims.

## Alternatives rejected
- Implement ITEM features without grounding (rejected: hallucination risk)

## Deferred
- All ITEM-specific integrations (waiting on excerpts/license)

## Risk tradeoffs
- Minimal YAML parser (no deps) vs full YAML: chosen to avoid supply chain additions.

## GA alignment
- Improves determinism and machine-verifiability of future subsumptions.
