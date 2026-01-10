# Embodiments and Design-Arounds — ITD-OIP

## Alternative Embodiments

- **Trace capture:** Interactive traces can include UI actions, transform parameters, and data source metadata to preserve execution fidelity.
- **IR compilation:** The IR may be represented as a DAG, relational algebra plan, or declarative workflow graph to support optimizer rewrites.
- **Optimization rules:** Rewrites can include caching, rate-limit aware batching, join reordering, and filter pushdown to reduce latency and cost.

## Implementation Variants

- **Policy and license verification:** Plan operations may be validated against policy-as-code rules and data source license constraints before execution.
- **Witness chaining:** Witness records can include input/output commitments, policy decision identifiers, and step-level hash chaining for tamper evidence.
- **Macro portability:** Investigation macros may replace entity identifiers with salted commitments for cross-tenant sharing and replay.

## Design-Around Considerations

- **Selective materialization:** Execution can materialize results into a graph store, a document store, or a transient cache as long as provenance annotations persist.
- **Cost estimation:** Pre-execution estimates can use sampled statistics, cardinality approximations, or historical telemetry to forecast execution cost.
- **Jurisdictional controls:** Compliance checks can be enforced at compile time, execution time, or both without altering the plan semantics.
