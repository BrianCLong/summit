# Decisions — claim-level-graphrag

## Adopted
- **Claim-level decomposition as first-class artifact:** We treat extracted claims as the primary unit of verification, moving away from monolithic answer scoring.
- **Deterministic evidence bundle schemas:** All verification runs must produce `report.json`, `metrics.json`, and `stamp.json` with stable hashing.

## Deferred
- **NLI-based support scoring:** We are mocking the verification logic initially. Natural Language Inference (NLI) integration is deferred to Lane 2.
- **Graph-backed per-claim retrieval adapter:** Direct Cypher generation is deferred to Lane 2.

## Rejected
- **Copy/paste external implementations:** We are implementing clean-room logic to avoid IP issues with existing research or libraries.

## Risks
- **Over/under-splitting claims:** Heuristic splitting might break semantic meaning.
- **Performance:** Per-claim retrieval might increase latency significantly without optimization (caching, batching).
