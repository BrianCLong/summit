# Embodiments and Design-Arounds — OAEAC

## Alternative Embodiments

- **ABI formats:** The ABI may be emitted as Protocol Buffers, GraphQL schema extensions, or JSON Schema, each preserving typed read/write contracts and action signatures.
- **Contract execution:** Preconditions and postconditions can execute inside a trusted execution environment, a policy sidecar, or a serverless function, while still emitting witness records.
- **Graph persistence:** State changes can target property graphs, RDF triples, or document stores that project graph views, provided deltas and snapshot identifiers are recorded.

## Implementation Variants

- **Typed schemas:** Action arguments may be validated against typed schemas with versioned migrations to keep ABI evolution explicit and auditable.
- **Effect enforcement:** Export effects can require purpose-bound tokens and data egress constraints enforced by policy-as-code.
- **Witnessing:** Witness records can include hash commitments to inputs/outputs, policy decision identifiers, and optional hardware attestation quotes.

## Design-Around Considerations

- **Effect scoping:** Export actions can be constrained to signed allowlists or scoped datasets to limit data egress while retaining contract enforcement.
- **Witness ledger:** Tamper-evidence may be achieved via hash chaining, append-only logs, or anchoring digests to an external timestamping service without altering contract semantics.
- **Optimization layer:** Action optimizers may fuse adjacent writes or reorder read-heavy steps under contract invariants, ensuring determinism tokens accompany reordered plans.
