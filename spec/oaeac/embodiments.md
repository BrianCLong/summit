# Embodiments and Design-Arounds — OAEAC

## Alternative Embodiments

- **ABI formats:** The ABI may be emitted as Protocol Buffers, GraphQL schema extensions, or JSON Schema, each preserving typed read/write contracts and action signatures.
- **Contract execution:** Pre- and postcondition verification can run inside a trusted execution environment, a policy sidecar, or within a serverless function, while still emitting witness records.
- **Graph persistence:** State changes can target property graphs, RDF triples, or document stores that project graph views, provided deltas and snapshot identifiers are recorded.

## Design-Around Considerations

- **Effect scoping:** Export effects can be constrained to signed allowlists or purpose-bound tokens to limit data egress while retaining contract enforcement.
- **Witness ledger:** Tamper-evidence may be achieved via hash chaining, append-only logs, or anchoring digests to an external timestamping service without altering contract semantics.
- **Optimization layer:** Action optimizers may fuse adjacent writes or reorder read-heavy steps under contract invariants, ensuring deterministic replay tokens accompany reordered plans.
