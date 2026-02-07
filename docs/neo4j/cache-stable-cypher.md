# Cache-Stable Generated Cypher (Neo4j 2025/Cypher 25)

## Readiness assertion
This capability aligns to the Summit Readiness Assertion and must remain evidence-backed and reversible. See `docs/SUMMIT_READINESS_ASSERTION.md`. 

## Intent
Establish a cache-stable Cypher generation and evaluation pipeline so LLM-generated queries do not thrash Neo4j plan caches, preserving planner latency, benchmark stability, and multi-tenant safety.

## Objectives
1. Deterministic Cypher canonicalization (stable casing, aliasing, ordering where safe).
2. Aggressive parameterization to maximize plan cache reuse.
3. Policy-based cache directives (`CYPHER cache=force|skip`) applied only after validation.
4. Bench harness that splits planner time vs runtime and emits evidence artifacts.
5. Evidence-first rollout with reversible defaults.

## Authority alignment
All artifacts must use canonical definitions and authority files:
- `docs/governance/CONSTITUTION.md`
- `docs/governance/META_GOVERNANCE.md`
- `docs/governance/AGENT_MANDATES.md`
- `docs/ga/TESTING-STRATEGY.md`
- `agent-contract.json`

## Scope (phase 1)
- Cypher normalization + parameterization library.
- Cache policy engine with safe directive insertion.
- Microbench harness that reports planner vs execution timing.
- Evidence bundle emission: `report.json`, `metrics.json`, `stamp.json`.

## Deferred pending validation (must be closed before production default)
- A1: Confirm whether whitespace-only differences change cache keys in target Neo4j versions.
- A2: Confirm the query-size rule/threshold that prevents plan caching and whether `cache=force` overrides.
- A3: Confirm all Summit query execution paths can accept canonicalized Cypher with prefixed `CYPHER` directives.

## Validation plan
1. **Whitespace/hash experiment**: two queries differing only in whitespace; compare plan cache hit behavior and planning time delta.
2. **Oversized query experiment**: ramp query length until cache behavior changes; validate `cache=force` behavior.
3. **Integration path audit**: verify all execution paths accept canonicalization + directive prefixing.

## Evidence artifacts (required per run)
- `report.json`: scenario config, environment, raw timings.
- `metrics.json`: aggregates, deltas vs baseline, pass/fail.
- `stamp.json`: `{ git_sha, neo4j_version, gds_version, driver_version, config_hash, timestamp_utc }`.

## MAESTRO alignment
- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered**: cache-thrash DoS, prompt injection into Cypher text, multi-tenant leakage, supply-chain drift.
- **Mitigations**: deterministic rendering, parameterization, policy gate for directives, per-tenant budget controls, pinned versions and SBOM evidence.

## Rollback posture
- Default behavior remains unchanged until A1–A3 are closed.
- Feature flags gate canonicalization and cache directives.
- Rollback is a config flip plus removal of new bench gates.

## Next steps
1. Implement canonicalization + parameterization library with golden tests.
2. Add cache policy engine with directive insertion tests.
3. Build planner/runtime microbench harness with evidence output.
4. Add docs and runbooks for execution and interpretation.

## Status
This plan is active and governed. Execution requires evidence artifacts and explicit validation of A1–A3 before production defaults change.
