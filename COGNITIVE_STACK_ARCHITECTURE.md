# Cognitive Stack Architecture Pattern

This pattern organizes durable agent memory into explicit modules with contractable boundaries so that reasoning stays small and auditable while knowledge capture remains rich.

---

## Reference architecture

- **Ingress**: tool calls, user prompts, sensors, and scheduled jobs write raw traces into episodic memory.
- **Processing lanes**: asynchronous distillation services promote facts to semantic memory, mine workflows into procedural memory, and update organizational edges.
- **Serving path**: the working context composer slices the modules into a bounded context window for each step and records outcomes back to episodic memory.
- **Control plane**: policy guards enforce profile constraints, entitlement checks, and retention/PII policies across all modules.

```
[Inputs] -> [Episodic Log] --distill--> [Semantic KB]
                        \--mine--> [Procedural Skills]
                        \--graph--> [Org Graph]
      [Core Profile] --guardrails--> [Working Context Composer] -> Agent action -> [New Episode]
```

---

## Module contracts

- **Core Profile Memory**
  - Purpose: stable identity, non-negotiable constraints, risk tolerances.
  - API: `get_profile(actor_id)`, `update_profile(change_request)` (requires approval token), `evaluate_policy(work_context)`.
  - Persistence: signed config docs (YAML/JSON) with change history; optionally anchored via hash chain for tamper evidence.

- **Episodic Memory**
  - Purpose: append-only record of concrete steps (trigger, retrieved context, plan, tool calls, outcomes, follow-ups).
  - API: `append_episode(trace)`, `query_episodes(filter: time/entity/task/outcome)`, `summarize_window(window_size)`.
  - Persistence: log store (e.g., Postgres JSONB or S3 + Parquet) plus vector index over embeddings for similarity search.

- **Semantic Memory**
  - Purpose: distilled facts, schemas, and refined summaries for RAG and truth queries.
  - API: `upsert_fact(fact_doc)`, `semantic_search(query, top_k)`, `get_fact(id)`, `expire_fact(id)`.
  - Persistence: document store with embeddings; maintain lineage back to episodes for auditability.

- **Procedural Memory**
  - Purpose: reusable skills (runbooks, workflows, tool-use strategies) with success metrics.
  - API: `list_procedures(tags)`, `get_procedure(id)`, `record_outcome(id, success, telemetry)`, `promote_candidate(trace)`.
  - Persistence: versioned repo of DSL or YAML procedures; execution metadata stored alongside for success-rate tracking.

- **Organizational Memory**
  - Purpose: graph of projects, owners, dependencies, SLAs, and collaboration patterns.
  - API: `get_subgraph(scope)`, `route_task(task, constraints)`, `update_edge(source, target, metadata)`.
  - Persistence: property graph (e.g., Neo4j) or graph tables; edges carry freshness and confidence scores.

---

## Working context composer (per-turn flow)

1. **Profile slice**: load actor constraints, safety rules, and preferences relevant to the request.
2. **Episode retrieval**: fetch recent episodes plus correlated entities/outcomes; include references not raw blobs to conserve tokens.
3. **Semantic retrieval**: run hybrid search (keyword + vector + graph-hop) for top-k facts; attach provenance.
4. **Procedure selection**: choose candidate workflows ranked by match score and historical success rate.
5. **Org routing**: extract relevant subgraph for owners, approvers, and dependencies.
6. **Guardrails**: evaluate the assembled context against profile policies (safety, PII, compliance) before execution.
7. **Emission**: return the bounded context plus pre-declared writes (new episode, potential procedural/org updates) to keep downstream tooling auditable.

---

## Update and hygiene flows

- **Distillation pipeline**: schedule jobs that convert episodic traces into semantic facts and candidate procedures; include lineage links and confidence scores.
- **Governance**: profile updates require dual control; procedural and org changes record reviewer identity and automated checks (tests, SLAs) before promotion.
- **Observability**: emit metrics for retrieval hit rate, context token cost, success rate per procedure, and routing correctness; trace each context slice with an ID.
- **Data retention**: apply tiered retention (hot episodic logs -> summarized cold storage); enforce redaction for sensitive fields before external sharing.

---

## Implementation starter kit

- **Schemas** (example minimal):
  - `episodes(id, actor_id, ts, trigger, plan, tools[], outcome, followups[])`
  - `facts(id, episode_ids[], summary, embedding, freshness, confidence)`
  - `procedures(id, name, dsl, tags[], success_rate, last_validated)`
  - `org_edges(source, target, rel_type, weight, freshness, owner)`

- **Service layout**:
  - `composer-service`: orchestrates per-turn context assembly; exposes gRPC/HTTP endpoints; enforces profile guardrails.
  - `distiller`: consumes episodic streams, emits facts/procedure candidates; configurable back-pressure and retries.
  - `org-router`: graph API for routing/impact analysis; caches hot subgraphs.

- **Algorithmic enhancement**: use reciprocal-rank fusion over keyword, vector, and graph-neighborhood searches to improve recall without bloating the context window.

---

## Quality, testing, and ops

- **Testing**: unit tests for module APIs; integration tests for composer assembly paths; property tests for idempotent append/query; chaos tests for delayed distillation queues.
- **SLOs**: p95 composer latency < 300ms; distillation freshness < 10 minutes; profile guardrail failures auto-block execution.
- **Runbooks**: procedures for reindexing embeddings, rotating profile keys, and reheating caches after deploy.
- **Security**: attribute-based access control across modules; immutable audit log; optional confidential-compute for sensitive profile evaluation.

---

## Adoption checklist

- [ ] Define initial schemas and storage backends for each module.
- [ ] Implement composer service with guardrail evaluation and provenance IDs.
- [ ] Stand up distillation jobs with lineage and confidence scoring.
- [ ] Wire observability (metrics + traces) and retention policies.
- [ ] Pilot with narrow tasks, then expand indexing (entities, outcomes, SLAs) as usage grows.
