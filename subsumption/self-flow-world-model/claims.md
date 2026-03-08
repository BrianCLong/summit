# Self-Flow → SWMA — Claim Registry

## Assumptions

| Assumption | Validation |
|---|---|
| Self-Flow latent representations generalise to world-model state embeddings | Evaluate across `world_model_prediction` eval fixtures |
| KG graph nodes can act as grounding signals for every WorldState | Test `semantic_graph_alignment` fixture against Neo4j |
| Enterprise action space (5 types) covers the planning domain | Extend `action_space.ts` after domain review |

## Ambiguities

- `StubSelfFlowEncoder` is deterministic but not trained. A real encoder must be wired before production evaluation.
- `graph_snapshot_id` is caller-managed; a KG write-back protocol is deferred to a follow-up PR.

## Tradeoffs

- Chose in-memory `InMemoryTrajectoryStore` for scaffolding — zero-dependency, easily swappable.
- Cosine similarity used for scoring; could be replaced with a learned reward model later.

## Stop condition

If the KG alignment accuracy from `semantic_graph_alignment` evals is < 50%, halt and consult the GraphRAG team before proceeding to the dynamics model layer.
