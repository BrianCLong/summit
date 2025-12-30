# Attribution Approximation

- **Sampling budget:** limits permutations for Shapley approximation; deterministic seed recorded in replay token.
- **Caching:** marginal scores cached per entity + replay token; invalidated on policy or index version changes.
- **Counterfactuals:** removal-based decision outputs for selected sources; concentration alerts when a single source dominates.
- **Proof budget:** limit evidence bytes/count to keep artifacts compact while retaining verifiability.
