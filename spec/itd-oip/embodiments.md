# Embodiments and Design-Arounds — ITD-OIP

## Alternative Embodiments

- **IR choices:** The intermediate representation can be a DAG of logical operators, a relational algebra plan, or a graph-query plan while retaining trace-to-plan lowering and optimization.
- **Optimization strategies:** Rewrite rules may be rule-based, cost-based using learned latency/cost models, or reinforcement-learning-guided while honoring effect constraints.
- **Execution targets:** Optimized plans can run on a distributed execution engine, a single-node orchestrator, or a sandboxed worker pool, provided witness records capture commitments and decisions.

## Design-Around Considerations

- **Privacy-preserving macros:** Entity identifiers in shareable macros can be replaced with salted commitments or partially redacted handles while maintaining replay fidelity through replay tokens.
- **Licensing gates:** License verification may use per-tenant entitlements, usage caps, or signed tokens; rejection paths should emit policy identifiers without leaking restricted data.
- **Plan materialization:** Results may be stored as graph projections, relational tables, or signed result bundles; witness chains remain hash chained regardless of storage format.
