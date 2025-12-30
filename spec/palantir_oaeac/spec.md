# Ontology ABI + Enforced Action Contracts (OAEAC)

**Objective:** Generate ABI for ontology actions with pre/post conditions, effect typing, and witnessed execution.

**Core Flow**

1. Receive ontology defining object types and action types.
2. Generate ABI with typed schemas for reads/writes and action invocation.
3. Attach action contracts (preconditions, postconditions, effect signatures).
4. On execution request: verify preconditions; authorize effect signature via policy gateway; apply state change to graph store; verify postconditions.
5. Emit execution artifact with witness record and determinism token.
