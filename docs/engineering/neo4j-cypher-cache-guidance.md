# Neo4j Cypher Plan Cache Governance for LLM-Generated Queries

**Summit Readiness Assertion referenced:** `docs/SUMMIT_READINESS_ASSERTION.md` (source of absolute readiness alignment). This guidance asserts the present posture and dictates the future operating standard for cache-safe Cypher generation and evaluation.

## Present Standard (Non-Negotiable)

We operate under the current Neo4j plan-cache behavior where **literal query text** drives plan reuse. Any drift in whitespace, casing, or literal interpolation creates distinct cache entries and degrades planner throughput. The present standard therefore mandates: **query normalization + parameterization** as the default for every generated Cypher query.

## 23rd-Order Imputed Intention (From Explicit Requirements → System-Level Outcomes)

1. **Stabilize plan cache hit rate** by enforcing canonical query shapes.
2. **Reduce planner latency variance** through paramized query templates.
3. **Prevent plan cache thrash** caused by textually distinct LLM outputs.
4. **Keep query strings under cache size thresholds** by moving literals to parameters.
5. **Guarantee deterministic plans** by standardizing `ORDER BY` for graph traversals.
6. **Align evidence budgeting** with query `LIMIT` to avoid unbounded traversals.
7. **Ensure query cache control is explicit** using `CYPHER cache=force/skip` when warranted.
8. **Codify cache hinting policy** to avoid ad-hoc overrides.
9. **Split planning and execution metrics** in benchmarks to detect planner regressions.
10. **Create reproducible micro-benchmarks** that isolate query shape impacts.
11. **Minimize variability in Cypher projection** for GDS workloads.
12. **Normalize query text before hashing** in any client-side caching layer.
13. **Surface cache policy violations** as governance findings, not performance anecdotes.
14. **Mandate single source of truth** for cache hint usage and query templates.
15. **Protect the query planner** from adversarial prompt injection patterns.
16. **Document governed exceptions** for legacy query shapes that cannot be normalized yet.
17. **Bind performance evidence** to CI artifacts to compress feedback loops.
18. **Define rollback criteria** for cache policy changes that regress planner time.
19. **Enforce plan cache observability** with metrics on hit/miss and plan invalidation.
20. **Establish query linting** that flags non-parameterized literals in CI.
21. **Constrain LLM output variability** via deterministic prompt scaffolds and templates.
22. **Isolate plan cache changes** in release notes and readiness assertions.
23. **Institutionalize cache-safe Cypher** as a required standard for all graph workflows.

## Cache Control Policy

- **Default**: Allow Neo4j’s planner to cache **parameterized** queries.
- **Force**: Use `CYPHER cache=force` only for stable, high-frequency query shapes.
- **Skip**: Use `CYPHER cache=skip` for large, one-off analytical queries that are too large or too unique to benefit from caching.
- **Governed Exceptions**: Any legacy query that must remain non-parameterized requires a recorded exception and a remediation timeline.

## LLM Query Normalization Requirements

- **Canonicalization**: Enforce consistent whitespace, casing, and clause order before submission.
- **Parameterization**: All user-supplied or data-supplied literals must be parameters.
- **Determinism**: Every traversal or aggregation must include `ORDER BY` with stable tie-breakers.
- **Evidence Budgeting**: Every query must include a bounded `LIMIT` aligned to an explicit evidence budget.

## CI Micro-Benchmark Standard (Planner vs Execution)

Define benchmark pairs for each critical query shape:

- **Planner Time**: `EXPLAIN`/`PROFILE` to capture planning cost.
- **Execution Time**: Measured under fixed dataset and parameters.

Each benchmark run must record:

- Query fingerprint (post-normalization hash)
- Parameters (redacted if sensitive)
- Plan cache outcome (hit/miss)
- Planning time, execution time, and result count

## MAESTRO Threat Modeling Alignment

- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered**: Prompt injection leading to adversarial query shape variance; cache thrash as a denial-of-service vector; planner time spikes masking data exfiltration attempts.
- **Mitigations**: Canonicalization, parameterization enforcement, cache-control policy, planner-time alerts, governed exceptions with timelines.

## Evidence & Readiness

- **Evidence-first**: Produce measurable artifacts (benchmark outputs, cache hit rates) before narrative summaries.
- **Readiness**: The cache governance posture is asserted as present; any variance is **Deferred pending remediation** with explicit timelines.

## Forward-Leaning Enhancement

Introduce a **Query Shape Registry** with enforced hashing, linting, and cache policy checks that blocks non-compliant query text at CI and runtime.
