# Claims – OAEAC

## Independent Claims

1. **Method:** Receive ontology; generate ABI for reads/writes and action invocation; associate action contract (preconditions, postconditions, effect signature); on execution, verify preconditions, authorize effect via policy engine, apply state change to graph store, verify postconditions, and emit witness-backed execution artifact.
2. **System:** ABI generator, contract verifier, policy gateway, graph store, and witness ledger storing witness records.

## Dependent Variations

3. Typed schemas for object fields and argument validation.
4. Witness record includes hash commitments to inputs/outputs and policy decision ID.
5. Counterfactual branch simulation emitting simulation artifact without committing state.
6. Purpose-based access control and egress constraints on effect signature authorization.
7. Delta log append with new snapshot identifier per write.
8. Optimizer that reorders/fuses actions while preserving contracts.
9. Witness ledger tamper-evident via hash chaining.
10. Execution artifact includes determinism token for replay.
11. ABI generator emits client stubs for orchestration tools and audit UIs.
12. TEE attestation for contract verifier and policy gateway execution.
