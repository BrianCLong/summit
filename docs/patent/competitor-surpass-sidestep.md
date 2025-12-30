# Competitor surpass-by-sidestep methods (patent-ready)

## Traceability (patent intake alignment)

- **Idea title:** Surpass-by-sidestep graph+copilot methods for competitor parity
- **Submitter(s) and contact:** Summit Patent Working Group (patents@summit.local)
- **Date submitted:** 2025-12-30
- **Related repositories / components:** Summit/IntelGraph/MC meta-orchestrator, provenance ledger, OPA policy packs
- **Problem this idea solves:** Establish defensible, deployable sidestep paths that outperform each competitor while respecting compliance-first delivery.

### Epic alignment and notes

| Epic (link)                                                                                                      | Alignment check | Notes                                                                      |
| ---------------------------------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------- |
| [Epic 1 – Air-gapped deployable baseline](../SUMMIT_2025_ROADMAP.md#3-prioritized-roadmap-6–12-months)           | [x]             | Offline deployable bundles and sealed attestations reused across methods.  |
| [Epic 2 – Secure LLM copilot and retrieval layer](../SUMMIT_2025_ROADMAP.md#3-prioritized-roadmap-6–12-months)   | [x]             | Graph-aware copilots with policy traces and governed traversal budgets.    |
| [Epic 3 – Federation + cross-domain ingestion mesh](../SUMMIT_2025_ROADMAP.md#3-prioritized-roadmap-6–12-months) | [x]             | Federation-aware routing for knowledge bases and cross-tenant graph joins. |
| [Epic 5 – Offline-first/mobile field kit](../SUMMIT_2025_ROADMAP.md#3-prioritized-roadmap-6–12-months)           | [x]             | Sync-safe, policy-scoped local packs for forward bases.                    |
| [Epic 6 – Investigations UI 2.0](../SUMMIT_2025_ROADMAP.md#3-prioritized-roadmap-6–12-months)                    | [x]             | Copilot surfaces expose sidestep paths with explainable rationales.        |

### Novelty, deployment, and prior art anchors

- **Novelty vs. prior art:** Each method fuses hybrid symbolic–LLM planning, active reward shaping, and cost-aware orchestration that prior competitor patents lack, as established in the meta-orchestrator release note’s patentability assessment.【F:docs/meta-orchestrator-release-note.md†L9-L45】
- **Deployment contexts:** Cloud, on-prem, disconnected/air-gapped, and mobile field kits; GPU optional with policy-gated fallbacks.【F:docs/patent-intake-form.md†L23-L46】
- **Dependencies:** Policy engine (OPA), provenance ledger, embeddings + vector store, sealed bundles with attestations.

## Sidestep methods by competitor

Each method includes specification, pseudocode, API surface, complexity, integration mapping (Summit UI/IntelGraph graph services/MC meta-orchestrator), deployment/compliance considerations, and differentiating prior-art citations.

### Palantir

- **Method:** Policy-rationalized dual-plane graph copilot that enforces traversal risk budgets and emits immutable audit facts, side-stepping Palantir’s audit-led pipelines by coupling LLM rationales with symbolic budgets.【F:docs/meta-orchestrator-release-note.md†L9-L45】
- **Specification:** Split query into symbolic traversal plan + LLM narrative; enforce per-hop risk budget; auto-route high-risk hops to offline bundle.
- **Pseudocode:**
  ```python
  plan = symbolic_plan(query, graph_schema, risk_budget)
  for hop in plan:
      if hop.risk > risk_budget.remaining:
          hop = route_offline(hop)
      evidence = llm_explain(hop)
      ledger.record(hop, evidence, policy=opa.check(hop))
  return aggregate(plan)
  ```
- **API:** `POST /copilot/graph/query` with fields `{query, risk_budget, offline_allowed}`; emits `{plan, evidence, ledger_ref}`.
- **Complexity:** O(E + V) traversal; O(n) ledger writes; LLM calls amortized by hop count.
- **Integration:** IntelGraph `graph-service` for traversal, MC meta-orchestrator for policy routing, Summit UI copilot pane for rationales.
- **Deployment/compliance:** Air-gapped bundle uses sealed policy + embeddings; FedRAMP/SOX evidence via ledger channel; no PII leaves domain.

### Neo4j

- **Method:** Differential path sampling with provenance-weighted embeddings that bypasses single-path Cypher reliance by sampling multiple candidate walks and selecting explainable, policy-legal paths.【F:docs/meta-orchestrator-release-note.md†L9-L12】
- **Specification:** Generate k sampled walks scored by provenance weight + policy clearance; pick top path with LLM explanation.
- **Pseudocode:**
  ```python
  walks = sample_walks(graph, k, policy=opa)
  scored = [(walk, provenance_score(walk) + policy_margin(walk)) for walk in walks]
  best = argmax(scored)
  return best, llm_explain(best)
  ```
- **API:** `POST /graph/sample-path` `{start, goal, k, policy_tags}` -> `{path, score, explanation}`.
- **Complexity:** O(k \* L) for walk length L; policy checks O(k).
- **Integration:** IntelGraph traversal engine with sampling plugin; Summit UI heatmap overlay; MC orchestrator caches approved paths.
- **Deployment/compliance:** Works offline with cached embeddings; policy tags enforce export-control; ledger stores sampled alternatives.

### TigerGraph

- **Method:** Edge-contractible anomaly loops that sidestep high-degree vertex bottlenecks by contracting risky hubs into policy-approved super-nodes before LLM summarization.【F:docs/meta-orchestrator-release-note.md†L9-L12】
- **Specification:** Detect hubs above degree threshold; contract with policy gating; run anomaly loop detection on reduced graph.
- **Pseudocode:**
  ```python
  hubs = {v for v in V if degree(v) > tau}
  contracted = contract(hubs, policy=opa)
  loops = detect_anomalies(contracted)
  summaries = [llm_explain(loop) for loop in loops]
  return loops, summaries
  ```
- **API:** `POST /graph/anomaly/contracted` `{tau, policy_tags}` -> `{loops, summaries}`.
- **Complexity:** O(E) contraction + O(E log V) anomaly detection.
- **Integration:** IntelGraph preprocessing job; MC orchestrator triggers contraction before analytics; Summit investigative UI shows loops.
- **Deployment/compliance:** Offline-safe; super-nodes tagged for provenance; audit logs capture contraction rules.

### Databricks

- **Method:** Cost-aware hybrid planner for graph+table joins that re-plans with live price feeds and policy traces, surpassing adaptive job schedulers by binding ledgered rationales to each switch.【F:docs/meta-orchestrator-release-note.md†L9-L45】
- **Specification:** Evaluate join options across graph store + lakehouse; pick plan minimizing cost×latency with compliance tags; ledger rationales.
- **Pseudocode:**
  ```python
  options = enumerate_plans(graph_ops, table_ops)
  scored = [score(plan, price_feed, latency, compliance=opa(plan)) for plan in options]
  best = argmin(scored)
  ledger.record(best, rationale=llm_explain(best))
  return execute(best)
  ```
- **API:** `POST /planner/hybrid` `{graph_ops, table_ops, price_feed}` -> `{plan, rationale, ledger_ref}`.
- **Complexity:** O(p) plan enumeration; scoring O(p); execution depends on plan.
- **Integration:** MC meta-orchestrator pricing adaptor; IntelGraph connectors to Spark; Summit ops console displays rationale.
- **Deployment/compliance:** Multi-cloud aware; ledger supports SOX/FedRAMP; offline mode reuses last known prices.

### Snowflake

- **Method:** Policy-sliced materialized views for graph-aware warehouse joins, sidestepping static warehouse policies by embedding OPA slices and LLM rationales into view refresh plans.【F:docs/meta-orchestrator-release-note.md†L9-L12】
- **Specification:** Build materialized views per policy slice; refresh schedule adapts to graph change events; explain refresh via LLM.
- **Pseudocode:**
  ```python
  slices = derive_policy_slices(graph_events)
  for s in slices:
      view = build_view(s)
      if staleness(view) > threshold:
          refresh(view)
          ledger.record(view, llm_explain(view))
  ```
- **API:** `POST /warehouse/policy-view` `{slice_rules, threshold}` -> `{views, ledger_refs}`.
- **Complexity:** O(S \* R) for S slices, R rows per refresh.
- **Integration:** IntelGraph emits graph events; MC orchestrator schedules refresh; Summit dashboard shows freshness badges.
- **Deployment/compliance:** Views packaged for air-gapped sync; audit entries per refresh; GDPR export-control tags enforced.

### Microsoft Copilot/Graph

- **Method:** Risk-budgeted enterprise graph prompts with deterministic fallback planners, surpassing policy-based CI/CD flows by binding each hop to ledgered explanations and offline fallbacks.【F:docs/meta-orchestrator-release-note.md†L9-L45】
- **Specification:** Prompt router chooses between LLM and deterministic planner based on risk budget; ledger captures rationale.
- **Pseudocode:**
  ```python
  if risk_budget < threshold:
      plan = deterministic_plan(query)
  else:
      plan = llm_plan(query)
  result = execute(plan)
  ledger.record(plan, evidence=llm_explain(plan))
  ```
- **API:** `POST /copilot/risk-aware` `{query, risk_budget}` -> `{result, plan, evidence}`.
- **Complexity:** Planner O(E) or O(len(query)); ledger O(1).
- **Integration:** IntelGraph deterministic planner; MC orchestrator risk gate; Summit copilot UI shows fallback choice.
- **Deployment/compliance:** Offline deterministic mode; FedRAMP evidence in ledger; zero-trust tokens for LLM access.

### AWS Bedrock Knowledge Bases

- **Method:** Policy-attested retrieval lanes that sidestep managed KB lock-in by staging dual indexes (public vs. restricted) with ledgered policy attestations and LLM rationales.【F:docs/meta-orchestrator-release-note.md†L9-L12】
- **Specification:** Maintain two indexes; query routed via policy; ledger includes attestation hash and rationale.
- **Pseudocode:**
  ```python
  lane = select_lane(policy=opa(query))
  docs = retrieve(index=lane, query=query)
  rationale = llm_explain(lane, docs)
  ledger.record(lane, rationale, attestation=hash(index_meta(lane)))
  ```
- **API:** `POST /retrieval/policy-lane` `{query, policy_tags}` -> `{lane, docs, rationale, attestation}`.
- **Complexity:** Retrieval O(log N); ledger O(1).
- **Integration:** IntelGraph embeddings; MC orchestrator lane selector; Summit search UI shows lane+attestation.
- **Deployment/compliance:** Air-gapped indexes; attestations stored locally; export-control tags enforced at lane selection.

### Google Vertex AI Search/Grounding

- **Method:** Counterfactual grounding with provenance deltas that surpass cross-cloud orchestration patents by emitting alternative grounded answers and recording policy-constrained deltas.【F:docs/meta-orchestrator-release-note.md†L9-L45】
- **Specification:** Generate primary grounded answer + counterfactual variant with different sources; ledger deltas and policies.
- **Pseudocode:**
  ```python
  primary = ground(query, sources)
  alt = ground(query, counterfactual_sources)
  delta = diff(primary, alt)
  ledger.record(delta, policy=opa(delta), rationale=llm_explain(delta))
  return select(delta)
  ```
- **API:** `POST /grounding/counterfactual` `{query, sources, counterfactual_sources}` -> `{primary, alt, delta, ledger_ref}`.
- **Complexity:** O(n) per grounding call; diff O(n).
- **Integration:** Summit search UI toggle; IntelGraph source registry; MC orchestrator handles policy diffing.
- **Deployment/compliance:** Offline grounding with cached sources; ledger captures source provenance; GDPR/CCPA checks on deltas.

### Elastic

- **Method:** Policy-aware sparse/dense fusion with anomaly gating that sidesteps default Elastic relevance by blending sparse BM25 and dense embeddings under OPA gates with ledgered rationales.【F:docs/meta-orchestrator-release-note.md†L9-L12】
- **Specification:** Compute sparse+dense scores; apply policy gate to boost/penalize; ledger final weighting.
- **Pseudocode:**
  ```python
  sparse = bm25(query)
  dense = embed(query) @ index
  score = fuse(sparse, dense, policy=opa(query))
  ledger.record(score_weights(score), llm_explain(score))
  ```
- **API:** `POST /search/fused` `{query, policy_tags}` -> `{results, weights, ledger_ref}`.
- **Complexity:** Sparse O(tfidf); dense O(Nd); fusion O(N).
- **Integration:** IntelGraph embedding service; Summit search UI; MC orchestrator stores fusion policy versions.
- **Deployment/compliance:** Offline-friendly with precomputed embeddings; evidentiary ledger for relevance shifts.

### Splunk

- **Method:** Temporal causal playbooks for log-to-graph binding that sidestep rule-only detections by generating causal chains with LLM explanations and policy-backed suppression budgets.【F:docs/meta-orchestrator-release-note.md†L9-L12】
- **Specification:** Convert logs to events, stitch causal chain, enforce suppression budget; ledger captures causal justifications.
- **Pseudocode:**
  ```python
  events = parse_logs(logs)
  chain = causal_chain(events)
  if suppression_budget_exceeded(chain):
      chain = prune(chain)
  explanation = llm_explain(chain)
  ledger.record(chain, explanation)
  ```
- **API:** `POST /logs/causal-playbook` `{logs, suppression_budget}` -> `{chain, explanation, ledger_ref}`.
- **Complexity:** Parsing O(n); causal linking O(n log n).
- **Integration:** MC orchestrator schedules playbooks; IntelGraph stores chains; Summit SOC view renders suppressions.
- **Deployment/compliance:** Offline parsing; evidentiary trail satisfies SOX/FISMA; policy budgets configurable per tenant.

### Stardog/RAI

- **Method:** Integrity-preserving reasoning over hybrid ontologies that sidesteps inference drift by combining symbolic consistency checks with LLM paraphrase validation and ledgered deltas.【F:docs/meta-orchestrator-release-note.md†L9-L12】
- **Specification:** Run DL reasoner; verify inferred triples with LLM paraphrase; ledger mismatches for human review.
- **Pseudocode:**
  ```python
  inferred = reason(ontology, data)
  for triple in inferred:
      paraphrase = llm_paraphrase(triple)
      if not consistency_check(triple, paraphrase):
          ledger.record(triple, paraphrase, status="flagged")
  return approved(inferred)
  ```
- **API:** `POST /ontology/reason-safe` `{ontology, data}` -> `{approved_triples, flagged, ledger_ref}`.
- **Complexity:** Reasoning O(R); paraphrase O(|inferred|).
- **Integration:** IntelGraph ontology store; MC orchestrator triggers validation; Summit knowledge UI shows flagged deltas.
- **Deployment/compliance:** Air-gapped reasoner bundles; ledger supports export audits; human-in-loop on flagged triples.

## Filing and next steps

- **Claim set mapping:** Graph copilot traversal, HE/ZK federation, sealed installer variants updated with ledger+risk-budget motifs across methods.【F:docs/patent-intake-form.md†L36-L58】
- **Provisional drafting checklist:** Ensure GPU-aware and offline variants drafted; confirm export-control before sharing drafts.【F:docs/patent-intake-form.md†L47-L50】
- **Docketing:** Record provisionals and conversion deadlines after counsel review.【F:docs/patent-intake-form.md†L59-L73】
