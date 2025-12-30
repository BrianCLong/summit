# QueryPlanRAG (QPR) Retrieval Compiler and Bytecode Runtime

This document details a production-ready design for compiling retrieval+tool workflows into deterministic bytecode that can be replayed, audited, and cached across sessions. It covers architecture, IR semantics, runtime, security, observability, and delivery considerations for Summit/IntelGraph.

## Goals

- **Deterministic, replayable retrieval pipelines** compiled once and executed many times.
- **Policy-first design** where permission checks are explicit IR ops, statically verified, and enforced at runtime.
- **Latency and cost moat** via optimized bytecode execution close to indices (vector, BM25, graph), minimizing LLM-in-the-loop.
- **Evidence-grade outputs** that capture paths, spans, policy decisions, and runtime traces for auditors and downstream agents.

## Non-Goals

- Replacing existing ingestion/indexing flows (reuse current data plane).
- Forcing a single ranking strategy—IR allows hybrid strategies selected by optimizer.

## High-Level Architecture

1. **Compiler Service (`/v1/qpr/compile`)**
   - Parses intent into an AST, lowers to IR, inserts policy/trust ops, verifies types/budgets, and optimizes with cost models + heuristics.
   - Caches compiled plans keyed by `(intent_signature, schema_version, policy_scope)`.
2. **Runtime Service (`/v1/qpr/execute`)**
   - Loads cached plans, binds request context (user, purpose, determinism seed), and dispatches bytecode ops against indices and tool adapters.
   - Emits a deterministic evidence program plus execution trace.
3. **Plan Store**
   - KV store (e.g., Postgres/Redis) holding IR blobs, metadata, and invalidation markers tied to schema/index versions.
4. **Policy Engine Integration**
   - POLICY_GUARD ops call OPA/ABAC with compiled policy bundles; static verifier rejects IR touching forbidden classes.
5. **Summit UI & MC Integration**
   - Plan graph viewer, evidence program viewer, replay with deterministic seed token; MC tool wrapper uses compile→execute with cache awareness.

```
┌────────────────┐       ┌────────────────┐
│   Summit UI    │       │ Maestro (MC)   │
└──────┬─────────┘       └──────┬─────────┘
       │ intelgraph_qpr tool           │
┌──────▼─────────┐  plan_id hit/miss  ┌─▼────────────┐
│  QPR Compiler  │<------------------>| Plan Store   │
└──────┬─────────┘                   └─┬────────────┘
       │ optimized IR                  │
┌──────▼─────────┐  bytecode execute  ┌─▼────────────┐
│ QPR Runtime    │------------------->│ Indices/OPA  │
└──────┬─────────┘                    └─┬────────────┘
       │ evidence program + trace       │
┌──────▼─────────┐                      │
│  Evidence API  │◀─────────────────────┘
└────────────────┘
```

## Intermediate Representation (IR)

Each op contains `op_code`, `inputs[]`, `params`, `constraints`, and optional `provenance`. Ops are deterministic and explicitly bounded by budgets.

### Canonical Ops

- `SEED{vector_k,bm25_k,entity_k,query_embed}`
- `EXPAND{rel_whitelist,max_hops,per_node_fanout}`
- `POLICY_GUARD{purpose,subject_ctx_hash}`
- `TRUST_PROP{model_id,decay}`
- `FILTER{expr,window,redaction_mode}`
- `JOIN{entity,join_keys}`
- `TOPK{k,score_expr}`
- `MATERIALIZE{fields,redaction_mode}`
- `CALL_TOOL{tool,args}`
- `EMIT_EVIDENCE{format,include_decisions}`

### Evidence Program

Returned object includes:

- `paths[]`: node/edge ids traversed.
- `spans[]`: redacted doc span pointers.
- `policy_decisions[]`: decision ids + reasons.
- `runtime_trace`: ops executed with timings and row counts.
- `determinism`: seed, index versions, policy bundle hash.

## Compile Flow

1. **Intent Extraction**: lightweight LLM/rule step to derive intent signature and goal context.
2. **AST→IR Lowering**: deterministic mapping to IR ops with explicit types.
3. **Policy/Trust Insertion**: place POLICY_GUARD/TRUST_PROP before data access ops.
4. **Verification**: type/schema validation; policy feasibility; budget upper bounds.
5. **Optimization**: cost-based + heuristic passes (pushdown guards, reorder JOINs, fuse FILTER+TOPK, choose vector vs BM25 paths).
6. **Caching**: `plan_id = hash(intent, schema.version, PolicyScope, budgets)` stored with invalidation hooks on schema/index changes.

## Runtime Flow

1. Fetch IR by `plan_id`; fail fast if policy scope mismatch or invalidated.
2. Bind execution context (user, purpose, determinism seed).
3. Dispatch ops; collect per-op metrics (rows, latency); enforce budgets mid-flight.
4. Assemble evidence program + trace; emit to provenance ledger and return to caller.

## Security & Compliance

- **Policy-as-code only**: all access mediated by POLICY_GUARD ops referencing OPA bundles; no hidden checks.
- **Tenant isolation**: plan cache keys include tenant/policy scope; runtime validates tenant on every data access.
- **Deterministic replay**: seed + index/policy versions stored with evidence; replay rejects if versions drift.
- **Audit hooks**: evidence program persisted to provenance ledger with signatures; emit immutable trail for human approvers.

## Observability

- Metrics: per-op latency, fanout, rows, cache hit rate, policy decision counts.
- Traces: op-level spans with determinism tags; attach `plan_id` and `policy_bundle_hash`.
- Logs: structured, redaction-aware, aligned with existing logging schema.

## Testing Strategy

- **Unit**: IR construction, verifier, optimizer transforms, cache key hashing.
- **Integration**: compile→execute path against fixture indices, policy bundles, and tool adapters.
- **Determinism tests**: replay with same seed/index versions yields identical evidence program.
- **Budget enforcement**: forced over-budget scenarios should short-circuit with telemetry and safe errors.

## Delivery Plan (Phased)

1. **MVP (2 sprints)**: core IR schema, compiler service, runtime skeleton, cache, POLICY_GUARD integration, evidence program emission.
2. **Perf Hardening**: learned cost model, op fusion, adaptive prefetch, vector/BM25 hybrid strategies.
3. **Ecosystem Hooks**: Summit plan/evidence viewers, MC tool wiring, provenance ledger export.
4. **Security/Audit**: full redaction modes, signature support, replay tokens, compliance dashboards.

## Forward-Leaning Enhancements

- **Differentiable cost model** tuned via offline traces to auto-select op orderings.
- **Partial plan specialization**: re-optimize hot ops based on live stats without full recompilation.
- **Zero-copy adjacency cache** shared across EXPAND ops for ultra-low latency graph walks.
- **Policy-aware speculative execution**: preflight policy checks for candidate expansions to prune early.
