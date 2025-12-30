# Policy Gateway Service

Coordinates policy retrieval and enforcement across TRACER, SASA, PGTT, RIT, and MEP workflows.

- Resolves policy versions based on replay tokens and routes decisions to the correct engines.
- Issues policy decision tokens for shard delivery and decision attribution.
- Provides caching keyed by policy hash and ontology hash for PGTT fixture reuse.
