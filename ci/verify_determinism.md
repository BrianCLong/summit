# Determinism Verification Protocol

To ensure all Summit artifacts are deterministic:

1. **No Timestamps**: Timestamps are strictly forbidden in all files except `evidence/stamp.json`.
2. **Sorted JSON**: All JSON files must be serialized with sorted keys.
3. **Mock Backends**: All mock backends must use fixed seeds.
4. **Stable IDs**: Use stable, pseudonymous identifiers for all graph nodes and edges.
5. **No Randomness**: Any stochastic processes must be seeded and recorded.
