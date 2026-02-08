# GraphRAG Evolution GA Spec: Reasoning Scope Isolation & Inference Firewalls

**Status:** Intentionally constrained to GA scope only.  
**Authority:** Summit Readiness Assertion is the readiness anchor for this spec. See `docs/SUMMIT_READINESS_ASSERTION.md`.  
**Law of Consistency:** This spec aligns with `docs/governance/CONSTITUTION.md` and `docs/governance/META_GOVERNANCE.md`.

---

## 1.0 ITEM Snapshot (Subsumed)

**ITEM:** “GraphRAG Evolution: Reasoning Scope Isolation and Inference Firewalls” (user-supplied synthesis + links).  
**Classification:** Conceptual input only; implementation is clean-room.

### 1.1 Assertions (Scoped)

* **Reasoning Scope Isolation:** per-question containment boundary; base facts are global; derived artifacts are temporary/scoped.  
* **Claim lifetimes / temporal KG alignment:** claims carry time-bound validity; expired claims require revalidation.  
* **Cypher as enforcement:** explicit separation of fact retrieval vs inference materialization; derived traversal is opt-in; “firewalls” restrict what the LLM can see.  
* **KG-CRAFT as production-adjacent pattern:** build KG from claims+reports, generate contrastive questions, distill evidence, then assess veracity.  
* **GNN contamination detection:** mis-citation in source; treated as analogy only. Direct evidence is **Deferred pending a directly relevant source**.

---

## 1.2 Decision: INTEGRATE (Governed + Deterministic)

Integrate the patterns as first-class Summit primitives: **scopes**, **firewalls**, **claim lifetimes**, **evidence bundles**, and **promotion governance**.

---

## 1.3 GA Success Criteria (Non-Negotiable)

1. **Zero cross-scope derived leakage** by default (enforced + tested).
2. **Policy-compiled Cypher constraints** (facts-only retrieval unless explicit override).
3. **Claim lifecycle enforcement** (expiry → revalidation or decay), observable in metrics.
4. **Deterministic evidence outputs** per run: `report.json`, `metrics.json`, `stamp.json` with stable IDs.
5. **Parallel-scope safety**: N scopes concurrently, no shared inferred state.

---

## 1.4 Target Architecture (Summit Primitives)

### A) Two-plane epistemic model

* **Fact Plane:** persistent, global, curated.
* **Inference Plane:** scoped, disposable, TTL-bound.

### B) Scope substrate

Each question/run creates:

* `scope_id`, `scope_policy_id`, `dataset_snapshot_id`, `created_at`, `agent_id`
* a “scope view” (overlay or namespaced partition) that never becomes global without promotion.

### C) Firewall enforcement layer

Cypher is the enforcement boundary between fact truth and model imagination. Queries must compile against policy guards.

### D) Claim Registry + lifetimes

Claims carry:

* `claim_id`, `kind` (fact|derived|hypothesis), `confidence`, `provenance`, `valid_from`, `valid_to`, `last_validated_at`, `ttl_policy`

---

## 1.5 Cypher Patterns (Firewall-by-default)

**Data conventions**

* Labels: `:Fact`, `:Entity`, `:Source`, `:Claim`, `:Derived`, `:Scope`
* Rels: `:SUPPORTED_BY`, `:DERIVED_FROM`, `:CONTAINS`
* Properties: `derived:boolean`, `scope_id`, `valid_from`, `valid_to`

**Query policy rules**

* Retrieval templates must include: `WHERE coalesce(r.derived,false)=false AND NOT n:Derived`.
* Traversal across derived edges requires `allow_inference=true`.
* Materialization queries must write only `:Derived`/`:Claim` within `scope_id`.
* Determinism: every Cypher must include `ORDER BY` and evidence `LIMIT` per `EvidenceBudget`.

---

## 1.6 KG-CRAFT → Summit Subsumption (“Claims Under Test”)

Summit generalizes KG-CRAFT into a reusable workflow:

1. Claims live in scoped plane.
2. Evidence is retrieved from fact plane + sources.
3. Verdicts produce auditable evidence bundles.
4. Promotion to fact is governed, signed, and reversible.

---

## 1.7 Contamination Detection (GA-safe stance)

**GA Phase 1:** deterministic drift heuristics (no ML):

* derived-context ratio
* derived-only path depth
* derived cycles
* scope reuse attempts

**Triggers:** scope reset / facts-only tightening / human review.

**Post-GA Phase 2:** optional ML scorer, gated behind feature flag.  
**Requirement:** directly relevant dataset + reproducible training; emit `drift_model_card.md` + training SBOM.  
**Status:** Deferred pending directly relevant reasoning-drift source.

---

## 1.8 PR Stack (Commit-ready, with gates + artifacts)

Each PR must attach evidence bundles (`report.json`, `metrics.json`, `stamp.json`) with stable IDs:
`EVID::graphrag::<yyyymmdd>::<scope_id>::<artifact>::v1`.

### PR-1 — Evidence Framework + Scope Manager

* `packages/evidence/*` → emits evidence artifacts
* `packages/graphrag/scope/ScopeManager.ts`
* CI gate: fail if artifacts missing or Evidence IDs invalid

**Acceptance Criteria:**

* Evidence artifacts emitted in deterministic order with stable IDs.
* Scope creation produces immutable `scope_id` and policy bindings.
* Rollback path documented for scope storage schema.

### PR-2 — Policy-compiled Cypher Firewalls

* `packages/graphrag/cypher/QueryPolicy.ts` (compile YAML policy → query guards)
* Tests: negative tests proving derived traversal blocked unless `allow_inference=true`

**Acceptance Criteria:**

* Facts-only retrieval by default.
* Policy compilation is deterministic and logged.
* Query audit trail includes `scope_id`, policy version, and Evidence ID.

### PR-3 — Claim Registry + Lifetimes

* `packages/graphrag/claims/ClaimRegistry.ts`
* `services/graphrag/jobs/ttl_sweeper.ts`
* Evals: `claim_decay.eval.ts` (expired claim reuse must be 0)

**Acceptance Criteria:**

* Claim validity enforced; expired claims rejected or queued for revalidation.
* TTL sweeper outputs evidence artifacts.
* Revalidation workflow defined with rollback steps.

### PR-4 — Scoped GraphRAG execution + parallel safety

* enforce `scope_id` on every derived write
* Evals: `parallel_scopes.eval.ts` (leakage edges == 0)

**Acceptance Criteria:**

* No cross-scope derived edges.
* Parallel scopes pass determinism and leakage checks.
* Evidence artifacts captured per scope.

### PR-5 — Drift Score + Auto-mitigation

* `services/graphrag/safety/drift_score.ts`
* Evals: `long_session_drift.eval.ts`

**Acceptance Criteria:**

* Deterministic drift scoring.
* Mitigations are enforced and recorded.
* Evidence artifacts include mitigation actions.

---

## 1.9 Summit-owned Benchmark: LSCB (Long-Session Contamination Benchmark)

**Metrics (deterministic):**

* `lscb.leakage_edges`
* `lscb.derived_ratio_auc`
* `lscb.expired_claim_reuse`
* `lscb.parallel_interference`

---

## 1.10 Security Model (GA minimum)

**Threats:**

* prompt injection tries to flip `allow_inference=true`
* Cypher injection / unsafe query gen
* cross-tenant leakage
* silent persistence of unreviewed inferences

**Controls:**

* deny-by-default QueryPolicy compiler
* read-only execution mode for most agents
* separate “promotion service” with approvals + signatures

---

## 1.11 License / IP / Provenance

* Treat ITEM as conceptual input; implement clean-room.
* Record provenance per claim: `source_uri`, `retrieved_at`, `content_hash`, `extract_span_ids`.
* Add SBOM hooks to CI for graph + ML deps.

---

## 1.12 Surpass & Obsolete (Summit-only)

**Three “impossible-for-them” features**

1. **Scope Replay Attestation:** replay any scope with identical dataset snapshot + policy, emit identical `stamp.json` and drift metrics.
2. **Governed Promotion Pipeline:** derived → fact requires signed approval + reversible graph diff.
3. **Tenant-grade Epistemic Isolation:** per-tenant policy + per-scope overlays with cryptographic leakage proofs (CI + runtime).

**Two architecture leaps**

1. **Overlay inference plane (mount/unmount)** instead of persisting inferred structure by default.
2. **Policy-compiled retrieval** (constraints compiled into every query), eliminating “developer discipline” as a control.

**Workflow redesign**

* “Claims as expiring work-items” (TTL + revalidation queue; no silent reuse).

---

## 1.13 Rollout Plan (Compressed)

0. ship scopes + evidence artifacts (no semantic change)
1. enable firewalls facts-only default
2. add lifetimes + TTL sweeper
3. add drift score + mitigation
4. later: optional ML drift scorer (directly sourced + reproducible)

---

## 1.14 Assumptions + Validation

* **Assumption:** Summit has a single choke point for Cypher execution.  
  **Validation:** run repo scan + runtime tracing; if absent, implement chokepoint first.
* **Assumption:** need directly relevant literature/source for “GNN reasoning contamination detection.”  
  **Status:** Deferred pending directly relevant source.

---

## 1.15 MAESTRO Security Alignment (Required)

**MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.  
**Threats Considered:** goal manipulation, prompt injection, Cypher injection, cross-scope leakage, tool abuse.  
**Mitigations:** deny-by-default QueryPolicy compiler, scope-bound writes, evidence artifacts, audit trail, promotion signatures, read-only execution mode.

---

## 1.16 Evidence-First Output Contract (UEF)

All execution and evaluation outputs must emit UEF bundles before narrative summaries:

* `report.json`
* `metrics.json`
* `stamp.json`

UEF artifacts are required for CI gates and audit trails.

---

## 1.17 PR Checklist Template (Attach to PR)

```markdown
- [ ] Change classification label applied (patch/minor/major)
- [ ] Evidence artifacts attached: report.json, metrics.json, stamp.json
- [ ] Determinism checks passing (Evidence IDs stable)
- [ ] Security review complete (deny-by-default policy verified)
- [ ] Rollback plan documented + validated
- [ ] Post-deploy monitoring window defined
```
