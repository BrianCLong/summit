# Maltego Join-Preserving Compilation (JPC) Specification

## Concept

Join-Preserving Compilation transforms transform workflows into minimal source query sets that preserve analyst-intended joins while reducing egress and source calls. Outputs include provenance-rich joined results and a join preservation certificate.

## Data model

- **Workflow spec**: Transform steps producing intermediate entities and join relationships.
- **Plan IR**: Typed graph of joins, filters, and provenance requirements.
- **Source queries**: Batches grouped by endpoint, respecting rate/license limits and egress budgets.

## Processing flow

1. Parse workflow spec into plan IR capturing joins and filters.
2. Compile plan IR into minimal source query sets that preserve join semantics and meet cost objectives.
3. Execute queries with egress enforcement and redaction.
4. Reconstruct joined outputs with provenance annotations and witness chains.
5. Emit workflow artifacts with join preservation certificates and replay tokens.
