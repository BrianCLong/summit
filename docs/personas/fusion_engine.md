# Deception-Resilient Persona Fusion & Anti-Linkage Awareness

## Commander's Intent
Implement the fusion logic that constructs persona hypotheses from multi-platform accounts. Explicitly track and flag where identity deception and anti-linkage tactics (like mismatched linguistic profiles or time zones) degrade confidence. Ensure light coupling with the narrative and CTI threat graphs.

## Concept
The `PersonaFusionEngine` ingests a set of `PlatformAccount` instances and pairwise linkage scores, iterating over them to formulate a `PersonaHypothesis`. When the engine detects divergent or anomalous properties across linked accounts (e.g. one account claims to be in the US and speaks only English, while a highly-linked counterpart on Telegram primarily uses Russian and operates on Moscow time), it raises a "Deception Signal".

The fusion process explicitly flags the persona's deception profile (e.g. `ANTI_LINKAGE_TACTICS` or `PERSONA_ARMY`) and degrades the linkage edges to `CONTRADICTED_LINK`. The `explain_persona` capability offers clear provenance of why accounts were fused and what counter-evidence was found.

## Abuse Analysis
- **Misuse Risk:** Black-box fusion might silently aggregate disconnected real individuals into a single targetable profile without explainability.
- **Design Constraint:** Fusion outputs must remain auditable, explicit, and constrained to defensive analysis context. Real-world outbound identity resolution is explicitly excluded; all tracking is internal to the graph.
