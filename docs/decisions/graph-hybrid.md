# Decisions: Graph+Vector Hybrid Retrieval Subsumption (graph-hybrid)

## Decisions made

- Contract-first portability before implementing engine-specific adapters.
- Deny-by-default policy fixtures required before runtime integration.
- Deterministic evidence schemas and index updates required for subsumption work.

## Alternatives rejected

- Implementing full GQL support (out of GA scope).
- Shipping real Neptune/Neo4j/TigerGraph adapters immediately (blast radius).

## Deferred items

- Real adapters (see backlog/graph-hybrid.yaml).

## Risk tradeoffs

- Yellow risk accepted for eval harness and interface design, mitigated by flags and CI gates.

## GA alignment

- Improves auditability and reduces lock-in risk with minimal runtime impact.

## MAESTRO Alignment

- **Layers**: Data, Agents, Tools, Observability, Security.
- **Threats considered**: Cross-tenant retrieval bleed, prompt injection via retrieved text, unbounded traversal.
- **Mitigations**: Deny-by-default policy fixtures, hop limits, deterministic evidence + verifier gate.
