# Claim Engineering for GraphRAG (Deterministic, Minimal, Governed)

## Purpose
This document defines the claim-engineering contract for Summit GraphRAG: deterministic, minimal answer surfaces with canonical claims, explicit evidence bindings, and fragility-aware governance controls.

## Core principles
1. **Answer surface minimization**: constrain responses to the smallest set of canonical claims that satisfy the user intent.
2. **Semantic idempotence**: re-running the same query set on a semantically unchanged graph yields the same meaning, ordering, and aggregation outputs.
3. **Claim compression**: collapse multiple supporting paths into a single canonical claim with confidence and fragility metadata.
4. **Fragility-aware gating**: brittle claims trigger hedging, evidence expansion, or refusal based on policy.

## Claim contract
A canonical claim is a structured object with the following minimum fields:
- **claim_id**: stable, deterministic identifier.
- **statement**: canonical claim text.
- **evidence_bindings**: ordered list of evidence node/edge IDs (stable identifiers, not internal DB IDs).
- **confidence**: calibrated confidence metadata (not a proxy for evidence volume).
- **fragility**: fragility score and rationale.
- **policy_outcome**: allow/hedge/withhold decision and policy reference.

## Answer surface budget
- Each response carries a claim budget; exceeding it requires a drill-down workflow.
- Claims are clustered by shared evidence so the surface remains minimal while preserving coverage.

## Semantic idempotence (Cypher)
- All Cypher outputs must be deterministic: explicit `ORDER BY`, stable grouping, and canonicalized aggregation outputs.
- Post-query canonicalization normalizes result ordering and schema to prevent semantic drift across plans or versions.

## Claim compression pipeline
1. **Graph-only compilation**: build canonical claims from graph-derived paths.
2. **Compression**: merge paths to a single claim with evidence bindings.
3. **Narration**: LLM may only restate the canonical claims and cite evidence bindings.

## Fragility-aware policy
- Fragility is a governance signal, not a truth score.
- High fragility requires additional evidence, hedging, or refusal depending on domain policy.

## Deterministic evidence artifacts
Each run must emit:
- `evidence/report.json`: claims, budgets, evidence bindings, queries and hashes, policy decisions, fragility signals.
- `evidence/metrics.json`: claim counts, verification rates, stability score, token budget.
- `evidence/stamp.json`: evidence ID, schema versions, config hashes, Neo4j version, query plan fingerprints.

## MAESTRO alignment
- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: semantic drift, unanchored claims, prompt injection, evidence tampering.
- **Mitigations**: deterministic canonicalization, claim-evidence binding, policy gating, evidence bundle emission.

## Implementation sequence (first increments)
1. Claim schema + evidence binding verifier.
2. Answer surface budget enforcement with drill-down UX.
3. Cypher semantic idempotence lint + canonicalizer.
4. Claim compression pipeline integration.
5. Fragility scoring v1 + policy gate.
6. Stability-under-mutation benchmark.
