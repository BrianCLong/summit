# Authority Compiler Specification

## Purpose
Normalize analyst NL queries into policy-compliant Cypher by applying RBAC/ABAC rules and authority scopes before preview or execution.

## Architecture
- **Inputs:** NL request payload `{ queryText, actor, contextFilters, tenant }`.
- **Stages:**
  1. **Parsing:** Convert NL to intent graph (entities, relations, filters) using deterministic templates seeded by demo data.
  2. **Policy fetch:** Pull active rules from policy registry (versioned). Cache for 5 minutes with ETag validation.
  3. **Authority compilation:** Apply allow/deny lists, transform restricted predicates, and attach justification metadata.
  4. **Safety checks:** Reject disallowed verbs (DELETE, CALL apoc.load) and unbounded traversals beyond depth 3 unless whitelisted.
  5. **Cypher emit:** Produce ordered candidates with confidence and policy trace.
- **Outputs:**
  - `candidates[]`: `{ cypher, confidence, policiesApplied[], rationale, warnings[] }`
  - `metrics`: `{ latencyMs, policyHits, guardrailsTriggered }`

## Contracts
- **Latency target:** <400 ms median on demo fixtures, P95 < 850 ms.
- **Explainability:** Every candidate includes policy IDs, severity, and textual summary; traces stored in provenance ledger.
- **Error model:**
  - `400`: malformed NL or missing actor/tenant.
  - `403`: policy violation with machine-readable codes.
  - `429`: guardrail limit exceeded (depth, unsafe verbs).

## Data Sources
- Policy registry endpoint: `/policy-registry/v1/policies?tenant={tenant}`.
- Neo4j metadata: read-only schema from `neo4j://sandbox` for intent grounding.
- Demo fixtures: `next_sprint_kit/scripts/generate_demo_data.py` seeds entities/relations used in tests.

## Validation Plan
- Contract tests comparing compiler output to expected Cypher for 10 curated NL prompts.
- Chaos input: adversarial prompts with unsafe verbs must return `403/429` and log audit trail.
- Telemetry: OpenTelemetry spans labeled `authority.compiler` with policy version tag.
