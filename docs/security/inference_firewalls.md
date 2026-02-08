# Inference Firewall Policy

## Objective
Prevent derived/inferred content from contaminating fact retrieval by enforcing deny-by-default
traversal rules. Derived traversal is only permitted via explicit policy flags and allowlists.

## Policy Rules
1. **Facts-only by default**
   - Retrieval queries must exclude `:Derived` nodes and derived relationships.
2. **Explicit opt-in**
   - Inference traversal requires `allow_inference = true` and an allowlisted query template.
3. **Scoped writes only**
   - Derived writes must attach `scope_id` and `derived: true`.
4. **Promotion requires governance**
   - Derived → Fact promotion requires signed approval and evidence metadata.

## Guardrail Patterns
- Require predicates such as:
  - `NOT n:Derived`
  - `coalesce(r.derived, false) = false`
- For inference traversal, enforce:
  - `($allow_inference = true OR coalesce(r.derived, false) = false)`

## Security Tests (CI)
- Negative test: queries referencing `:Derived` without allowlist must fail.
- Positive test: allowlisted inference traversal passes with `allow_inference = true`.
- Scoped leakage test: derived nodes from `scope_id = A` are invisible in scope `B`.

## Observability
- Emit audit logs with `scope_id`, `policy_id`, and `query_template_id`.
- Record rejected queries and policy denial reasons.

## MAESTRO Alignment
- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: prompt injection, Cypher injection, cross-tenant leakage.
- **Mitigations**: deny-by-default policy, allowlists, scoped writes, query auditing.
