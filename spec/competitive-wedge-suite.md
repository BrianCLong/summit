# Competitive Wedge Implementation Blueprint

This blueprint operationalizes ten differentiating wedges against incumbent enterprise graph, governed-agent, and managed-RAG vendors. Each wedge is framed for IntelGraph (graph + provenance), Summit (audit UX), and MC (orchestration) and is ready for production-grade delivery: interfaces, data contracts, execution plans, observability, security, and rollout steps.

## Global Architecture

- **Shared substrate:** DeltaGraph (append-only deltas + snapshots), Provenance Ledger (signed actions/witnesses), Policy Engine (OPA/rego), and Feature Registry (artifact lineage).
- **Execution fabrics:**
  - **Action Kernel** for delta programs and counterfactual branches (ADDT).
  - **Feature Fabric** for provenance-aware analytics artifacts (PAFF).
  - **Kernel Leasing Runtime** for latency-SLA graph kernels (LC-GKL).
  - **Router & Planner** for multi-KB trust/cost routing (MK-RCT) and graph-conditional retrieval (GCR).
- **Connector posture:** EMCP connectors default; GFJP pushes row-id projections only; CGG builds conflict graphs with abstain paths; GSQS emits hypothesis-validated queries.
- **Observability & safety:** Witness chains for every tool call (WTG), SLA dashboards for leases, conflict clusters surfaced in Summit, and clause-to-evidence bindings for synthesized queries.

## Wedge Specifications

### 1. Action-Diff Digital Twin (ADDT) — vs. Palantir Ontology

- **Goal:** Event-sourced deltas with counterfactual execution and replayable audit.
- **Data:** `DeltaGraph` entries `(id, t, op, payload_hash, actor, policy_scope)`; snapshots compacted periodically.
- **Interfaces:**
  - `POST /v1/twin/action` → `{snapshot_id, delta_ids, audit}`
  - `POST /v1/twin/diff` `{from,to,scope}` → `{object_diffs, causal_explanations}`
- **Runtime:** Compile actions to delta programs with policy guardrails; counterfactual branches run without commit.
- **Observability:** Emit provenance links for every delta and SLA metrics (`apply_ms`, `diff_ms`).
- **Tests:** Deterministic replay, counterfactual isolation, diff correctness across overlapping deltas.

### 2. Provenance-Aware Feature Fabric (PAFF) — vs. Neo4j GDS

- **Goal:** Features/embeddings as first-class artifacts with lineage and snapshot binding.
- **Data:** `FeatureArtifact = {id, compute_dag_hash, input_snapshot_id, params, output_store_ptr, provenance}`.
- **Interfaces:** `POST /v1/features/build`, `GET /v1/features/{fid}`, retrieval APIs accept `feature_refs`.
- **Runtime:** Compute DAG executor writes artifacts to registry; consumers resolve by `(artifact_id, version)`.
- **Observability:** Feature lineage graph, freshness SLAs, artifact integrity hashes.
- **Tests:** DAG reproducibility, version pinning, lineage integrity, rollback to prior feature version.

### 3. Latency Contracts via Graph Kernel Leasing (LC-GKL) — vs. TigerGraph

- **Goal:** Reserved, whitelisted graph kernels with hard latency contracts.
- **Data:** `KernelLease = {lease_id, graph_partition, cpu_quota, mem_quota, max_ms, allowed_ops_hash}`.
- **Interfaces:** `POST /v1/kernel/lease`, `POST /v1/kernel/exec` with `lease_id` + op IR.
- **Runtime:** Scheduler enforces quotas and op allowlists; emits execution traces; rejects non-conforming opcodes.
- **Observability:** SLA dashboards with p95/p99 latencies per lease class; admission control logs.
- **Tests:** Budget exhaustion handling, opcode allowlist enforcement, trace completeness, SLA percentile guardrails.

### 4. Witnessed Tool Governance (WTG) — vs. Databricks Unity Catalog

- **Goal:** Policy witnesses for every tool invocation; verifiable without full replay.
- **Data:** `Witness = H(tool_sig, inputs_commitment, outputs_commitment, policy_decision_id, env_measurement, timestamp)`.
- **Interfaces:** `POST /v1/tools/call` → `{output, witness}`, `GET /v1/sessions/{id}/witnesses`.
- **Runtime:** Policy engine approves/redacts args; witness chain stored in Provenance Ledger.
- **Observability:** Session witness completeness metric; failed verification alerts.
- **Tests:** Witness hash stability, redaction coverage, verification of tampered chains.

### 5. Graph-First Join Pushdown (GFJP) — vs. Snowflake Cortex Search

- **Goal:** Graph-first retrieval; warehouse acts as projection engine via minimal row-id sets.
- **Data:** `RowIdSet` keyed by entity mapping index; provenance ties rows to graph evidence.
- **Interfaces:** `POST /v1/retrieval/gfjp` returns `{graph_evidence, row_ids, rows}`.
- **Runtime:** Graph retrieval → entity-to-row mapping → batched fetch; policy ensures row-level visibility.
- **Observability:** Egress byte counters, row-id fan-out metrics, fetch latency per warehouse region.
- **Tests:** Row-id minimality, provenance continuity across graph + warehouse, policy-filter enforcement.

### 6. Egress-Minimized Connector Protocol (EMCP) — vs. Microsoft Copilot connectors

- **Goal:** Connectors return redacted spans + stable pointers; no bulk ingestion.
- **Data:** `{display_bytes, pointer, decision_id, ttl, source_attestation?}` per hit.
- **Interfaces:** `POST /v1/connectors/{source}/emcp_search`.
- **Runtime:** Local search inside source boundary; redaction + policy decision IDs emitted; MC refuses non-EMCP in restricted mode.
- **Observability:** Egress budgets per connector; TTL expiry alarms; redaction policy hit rates.
- **Tests:** Egress byte ceilings, pointer validity, decision-id auditability, TTL enforcement.

### 7. Multi-KB Router with Cost/Trust Guarantees (MK-RCT) — vs. AWS Bedrock KBs

- **Goal:** Route across KBs/tools with explicit cost/latency/trust constraints.
- **Data:** Tool profile `{p95_ms, cost_per_call, trust_floor, domains}`; plan captures selected tools and budget math.
- **Interfaces:** `POST /v1/router/plan`, `POST /v1/router/execute`.
- **Runtime:** Constraint solver (greedy/ILP) picks plan honoring `trust_dominance` rule; execution fused with provenance.
- **Observability:** Budget adherence reports, trust floor violations, per-tool cost ledger.
- **Tests:** Constraint satisfaction, cost overrun protection, trust ordering, fallback on plan infeasibility.

### 8. Conflict Graph Grounding (CGG) — vs. Vertex AI Search/Grounding

- **Goal:** Build conflict graphs across retrieved claims; force explicit resolution/abstain.
- **Data:** `ConflictEdges` between claims with source provenance; conflict clusters + clarifying questions.
- **Interfaces:** `POST /v1/grounding/cgg`.
- **Runtime:** Retrieve tiered evidence → claim extraction → conflict graph → questions for disambiguation.
- **Observability:** Conflict density metrics, abstain rates, question resolution cycle time.
- **Tests:** Conflict edge correctness, clustering stability, abstain-path coverage, regression on claim extractor models.

### 9. Graph-Conditional Retrievers (GCR) — vs. Elastic retrievers

- **Goal:** Retrieval pipelines branch on graph-derived hypotheses (entity/relationship priors).
- **Data:** Conditional pipeline graph with guarded branches; feedback-trained router.
- **Interfaces:** `POST /v1/retrievers/gcr/execute`.
- **Runtime:** Fast hypothesis stage → conditional pipeline selection → execution under branch budgets.
- **Observability:** Branch selection explanations, budget utilization per branch, router accuracy drift.
- **Tests:** Guard condition coverage, budget enforcement per branch, offline router evaluation, provenance of path choice.

### 10. Graph-Safe Query Synthesis (GSQS) — vs. Splunk AI Assistant

- **Goal:** Synthesize SPL/KQL/SQL from graph-validated hypotheses for safer, cheaper queries.
- **Data:** Hypothesis set `{indexes, sourcetypes, fields, entity_ids, time_bounds}` bound to evidence IDs.
- **Interfaces:** `POST /v1/query/synthesize?sink=spl`, `POST /v1/query/run` returns results + clause bindings.
- **Runtime:** Resolve hypotheses → guarded AST builder (time bounds, allowlists) → emit query + clause→evidence bindings surfaced in Summit.
- **Observability:** Query guardrail hits, execution cost vs. baseline, clause-level provenance display.
- **Tests:** Guardrail enforcement, clause-to-evidence binding integrity, hypothesis resolver precision/recall, cost regression checks.

## Implementation & Delivery Plan

- **Zone:** Documentation/spec only (no runtime coupling) to maintain single-zone safety.
- **Minimal viable release sequence:**
  1. Land ADDT + WTG foundational services (provenance, delta runtime, witness storage).
  2. Enable PAFF + GCR for analytics + retrieval determinism.
  3. Layer LC-GKL, GFJP, EMCP for performance + data-boundary posture.
  4. Add MK-RCT, CGG, GSQS for multi-source trust, conflict resolution, and safe query synthesis.
- **Security/compliance:** All policy decisions emitted as policy-as-code artifacts; witness chains required for tool calls; connectors enforce EMCP redaction; cost/trust routing respects trust floors.
- **Observability:** Standard metrics: SLA latencies (p50/p95/p99), budget adherence, egress bytes, conflict density, witness verification rate; traces tagged by `snapshot_id`, `artifact_id`, `lease_id`, `plan_id`.
- **Data migrations:**
  - DeltaGraph append-only table + snapshot compaction schedule.
  - FeatureArtifact registry (versioned, integrity hashed).
  - Witness ledger table keyed by session.
  - Tool profile catalog for MK-RCT.

## Validation Strategy

- **Unit:** Policy allowlist checks, witness hashing, delta replay, artifact lineage hashing, router constraint solver.
- **Integration:** End-to-end flows per wedge (e.g., action→delta→diff; plan→execute→budget check; EMCP search→pointer deref).
- **Property/Fuzz:** Counterfactual isolation (no state leak), redaction boundary fuzzing, cost-plan perturbation.
- **Performance:** Lease SLA load tests, GFJP row-id fan-out under heavy multi-hop queries, router plan time under 100 tools.
- **Security:** Policy-as-code conformance, tamper-evident provenance verification, connector egress audits.

## Rollout & Ops

- **Phased flags:** Feature flags per wedge (`addt`, `paff`, `lcgkl`, `wtg`, `gfjp`, `emcp`, `mkrct`, `cgg`, `gcr`, `gsqs`).
- **Readiness gates:**
  - Evidence artifacts stored for each end-to-end test run.
  - SLA SLOs met: ADDT apply p95 < 150ms, LC-GKL lease exec p95 < max_ms, router plan < 50ms for 50 tools.
  - Observability dashboards deployed for witness verification and conflict density.
- **Rollback:** Disable feature flags, revert to baseline retrieval/query generation, restore prior snapshot/feature versions, invalidate leases.

## Forward-Looking Enhancements

- **Adaptive leasing:** Dynamic lease resizing based on observed tail latencies with formal proofs of monotonic safety.
- **Proof-carrying witnesses:** STARK-style succinct proofs for witness chains to enable third-party verification without log access.
- **Active conflict resolution:** LLM-generated clarifying probes prioritized by value-of-information estimates for CGG.
- **Cost-aware conditional retrievers:** Multi-armed bandit to tune branch weights in GCR under budget constraints.
