# Competitor “surpass-by-sidestep” patentable methods

This note catalogs one patentable method per major competitor, focusing on sidesteps that avoid competing head-on with their UX or managed-service strengths. Each method includes specification, pseudocode, interfaces, complexity, integration hooks for Summit/IntelGraph/MC, and a concise claim surface (2 independent + 8 dependent) to accelerate drafting.

## 1) Palantir Foundry (Ontology + Action Types)

### Method: Witnessed Action Delta Ledger (WADL)

**Sidestep:** Compete on cryptographically witnessed state transitions (replayable, branchable, auditor-verifiable) rather than ontology UX.

**Specification**

- Actions compile to minimal ΔGraph patches plus a witness that commits to delta, policy decision ids, and the source snapshot.
- Supports counterfactual branches with merge rules and replay under policy gates.
- Witnesses are verifiable offline and survive export/import between air-gapped cells.

**Pseudocode**

```pseudo
ApplyAction(action, ctx):
  ir = CompileActionToDeltaIR(action, schema)
  dec = PolicyCheck(ir.effects, ctx.subject, ctx.purpose)
  delta = ExecDeltaIR(ir, head_snapshot)
  wit = Hash(delta, Commit(ctx), dec.id, head_snapshot)
  Append(delta_log, delta, wit)
  return NewSnapshot(delta)
```

**Interfaces**

- `POST /v1/actions/apply` → `{snapshot_id, witness}`
- `POST /v1/actions/simulate` → `{predicted_delta, witness}`
- `POST /v1/actions/verify` → `{valid, replay_pointer}`

**Complexity**

- `O(|delta|)` update; witness hashing `O(1)`; branch merge bounded by `O(|delta_branch| log n)`.

**Integration (Summit | IntelGraph | MC)**

- IntelGraph: delta IR + append-only ledger; offline witness verifier.
- MC: “simulate” for agent what-if; refuses unwitnessed commits.
- Summit: timeline diff + witness verification panel.

**Claim surface (draftable)**

- Independent A: Witness-bound action application that records ΔGraph patches with policy ids and snapshot commitments.
- Independent B: Counterfactual branch execution with later verifiable merge using witness commitments.
- Dependent (8): (1) proof-carrying export/import, (2) offline verification cache, (3) merge-conflict witness arbitration, (4) branch risk budgets, (5) policy-version pinning, (6) differential redaction of witnesses, (7) attested replay receipts, (8) dual-control approval for witness promotion.

## 2) Neo4j (GDS + AuraDS)

### Method: Provenance-Bound Feature Snapshots (PBFS)

**Sidestep:** Treat algorithm outputs as versioned, provenance-bound assets that retrieval/agents can cite and replay.

**Specification**

- `FeatureArtifact(fid) = {snapshot_id, algo_id, params_hash, output_ptr, lineage_hash}`.
- Feature registry enforces snapshot binding and immutability; retrieval references `fid` to anchor answers.
- Lineage queries expose DAG and parameters for repeatability and audit.

**Pseudocode**

```pseudo
BuildFeature(spec, snapshot):
  dag = Compile(spec)
  out = Run(dag, snapshot)
  fid = Hash(dag, snapshot, params)
  StoreArtifact(fid, out, lineage=Hash(dag))
  return fid
```

**Interfaces**

- `POST /v1/features/build`
- `POST /v1/retrieval/with_features` `{feature_refs:[...]}`
- `GET /v1/features/{fid}/lineage`

**Complexity**

- Build cost = algorithm dependent; bookkeeping `O(#dag_ops)`; retrieval dereference `O(k)` for `k` artifacts.

**Integration (Summit | IntelGraph | MC)**

- IntelGraph: artifact registry + snapshot binding; feature reuse across datasets.
- MC: pins `fid` in agent plans for deterministic replay.
- Summit: “answer used feature fid@v” audit ribbon.

**Claim surface (draftable)**

- Independent A: Generation of immutable feature artifacts bound to graph snapshots and parameter hashes.
- Independent B: Retrieval pipeline that requires citing feature artifacts with lineage validation before response emission.
- Dependent (8): (1) DAG fingerprinting for drift detection, (2) cross-snapshot compatibility gating, (3) privacy-tier tagging on artifacts, (4) GPU scheduling metadata, (5) zero-copy feature reuse across tenants via commitments, (6) SLA-aware feature prewarming, (7) automatic invalidation on schema change, (8) agent-visible provenance prompts.

## 3) TigerGraph (Pattern Matching + Multi-hop)

### Method: Adaptive Fanout Shaping with SLA Leases (AFS-SL)

**Sidestep:** Deliver predictable p95 latency via graph-search leases and adaptive fanout shaping instead of racing engine speed.

**Specification**

- Lease object: `{partition_set, p95_ms, max_expansions, rel_whitelist, subject_scope}`.
- Runtime tunes per-node fanout using live degree stats and remaining time/expansion budget.
- Lease scheduler enforces isolation across tenants and auditable SLA adherence.

**Pseudocode**

```pseudo
SearchUnderLease(seeds, lease):
  PQ = init(seeds)
  while PQ and expansions < lease.max_expansions and time < lease.p95_ms:
    v = PQ.pop()
    fan = TuneFanout(deg(v), remaining_budget)
    for e in SampleOutEdges(v, fan, lease.rel_whitelist):
      PQ.push(e.dst)
  return TopK()
```

**Interfaces**

- `POST /v1/lease/acquire`
- `POST /v1/search/leased`
- `GET /v1/lease/{id}/attest` (p95 + expansions evidence)

**Complexity**

- Bounded by `max_expansions`; per-pop tuning `O(1)`; lease attestation generation `O(log n)` for priority queue proof.

**Integration (Summit | IntelGraph | MC)**

- IntelGraph: lease scheduler + degree telemetry; stores attestation events.
- MC: allocates leases per workflow/incident room.
- Summit: SLA compliance dashboards with p95 evidence.

**Claim surface (draftable)**

- Independent A: Lease-governed graph traversal that adaptively shapes fanout to meet p95 latency.
- Independent B: Attested search results that include expansion counts and lease identifiers for audit.
- Dependent (8): (1) multi-tenant lease isolation, (2) relation whitelist enforcement, (3) budget-aware priority queue tuning, (4) hot-partition throttling, (5) lease-aware caching hints, (6) fallback sampling under overload, (7) auto-extend lease with dual approval, (8) hardware-aware fanout selection.

## 4) Databricks (Unity Catalog tool calls)

### Method: Effect-Stamped Tool Witness Chain (ESTWC)

**Sidestep:** Emit portable witnesses per tool call (inputs/outputs commitments + policy decision + effect type) beyond standard tool governance.

**Specification**

- Tool registry annotates effects `{READ|WRITE|EXPORT}`, data domains, PII class, and guardrails.
- Each call emits `Witness = H(tool_sig, effects, Commit(in), Commit(out), policy_id, env_meas)` appended to session log.
- Witnesses verifiable without replay; exports require witness proof.

**Pseudocode**

```pseudo
CallTool(tool, args, ctx):
  sig = Registry[tool]
  dec = PolicyCheck(sig.effects, args.meta, ctx)
  out = tool.exec(Redact(args, dec))
  wit = Hash(sig, Commit(args), Commit(out), dec.id, sig.effects)
  Append(ctx.session, wit)
  return out, wit
```

**Interfaces**

- `POST /v1/tools/call_witnessed`
- `GET /v1/sessions/{id}/witnesses`
- `POST /v1/witness/verify`

**Complexity**

- Witness overhead `O(1)` per call; session log append `O(log n)` with Merkle indexing.

**Integration (Summit | IntelGraph | MC)**

- IntelGraph: witness store + verifier; aligns with provenance schema.
- MC: refuses unwitnessed tool outputs; chains witnesses across steps.
- Summit: “verify session” UX with witness chain visualization.

**Claim surface (draftable)**

- Independent A: Tool invocation framework that emits effect-stamped, policy-bound witnesses.
- Independent B: Verification pipeline that validates tool outputs using witnesses without re-execution.
- Dependent (8): (1) dual PII and export class gating, (2) redaction rules bound to policy id, (3) Merkle-anchored session chains, (4) time-bounded witness validity, (5) hardware/environment attestations, (6) tool drift alerts via signature mismatch, (7) offline witness verification bundle, (8) cascading witness requirements for downstream tools.

## 5) Snowflake (Cortex Search)

### Method: Graph-Computed RowID Pushdown (GCRP)

**Sidestep:** Use Snowflake as a projection engine; compute candidate entity sets in IntelGraph and push down minimal RowIDs.

**Specification**

- Maintain mapping `entity_id → {table, row_id}` with provenance and freshness.
- Retrieval = graph multi-hop → RowID set → Snowflake fetch of only needed columns.
- Audit emits evidence linking graph entities to warehouse rows.

**Pseudocode**

```pseudo
Retrieve(query, ctx):
  entities = GraphRetrieve(query, ctx)        # trust+policy aware
  rowset = MapToRowIDs(entities)
  rows = SnowflakeFetch(rowset, cols=needed)
  return EmitEvidence(entities, rows)
```

**Interfaces**

- `POST /v1/retrieval/gcrp` → `{graph_evidence, warehouse_rows, audit}`
- `POST /v1/row-index/rebuild`
- `GET /v1/row-index/{entity}`

**Complexity**

- Graph phase `O(E log E)`; warehouse fetch `O(|rowset|)` batched; index rebuild `O(n)` with incremental updates.

**Integration (Summit | IntelGraph | MC)**

- IntelGraph: entity↔row index + connector; provenance joins.
- MC: tool-step `fetch_projections` uses RowID pushdown.
- Summit: cross-source evidence UI showing graph + warehouse rows.

**Claim surface (draftable)**

- Independent A: Retrieval pipeline that resolves graph entities to warehouse RowIDs before warehouse access.
- Independent B: Audit mechanism binding RowID fetches to graph provenance and policy checks.
- Dependent (8): (1) freshness-aware RowID cache, (2) sensitivity-aware column projection, (3) join minimization via graph-side pruning, (4) policy-aware RowID redaction, (5) Snowflake token budgeting, (6) conflict detection for multi-mapping entities, (7) streaming RowID pushdown for live queries, (8) RowID provenance embedding into LLM prompts.

## 6) Microsoft Copilot/Graph (Connectors + Retrieval API)

### Method: Zero-Copy Evidence Connector Protocol (ZCEP)

**Sidestep:** Avoid ingesting into someone else’s graph; connectors return redacted, proof-carrying evidence bundles only (no bulk copy).

**Specification**

- Connector output: `{display_spans, stable_pointers, decision_ids, ttl, optional attestation}` with byte caps.
- IntelGraph stores pointers + proofs; MC only consumes verified spans.
- TTL-enforced pointers reduce long-term custody risk.

**Pseudocode**

```pseudo
ConnectorSearch(query, ctx):
  hits = LocalSearch(query)                # stays in source
  safe = ApplyPolicyRedaction(hits, ctx)
  return PackEvidenceBundle(safe, ttl=short)
```

**Interfaces**

- `POST /v1/connectors/{source}/zcep_search`
- `POST /v1/evidence/verify`
- `GET /v1/evidence/{id}/renew`

**Complexity**

- Egress bounded by `top_k * max_bytes`; verification `O(log n)` with commitment trees.

**Integration (Summit | IntelGraph | MC)**

- IntelGraph: connector SDK + verifier; pointer store.
- MC: “verify-first” ingestion path for Copilot connectors.
- Summit: “data stayed in system-of-record” badge + audits.

**Claim surface (draftable)**

- Independent A: Zero-copy connector that returns policy-redacted evidence bundles with stable pointers and TTL.
- Independent B: Verification pipeline that enforces pointer validity before downstream use.
- Dependent (8): (1) attested pointer envelopes, (2) TTL renewal with revalidation, (3) dynamic byte-budget enforcement, (4) pii-aware redaction presets, (5) connector-specific policy fingerprints, (6) offline verification cache, (7) cross-tenant pointer isolation, (8) connector health scoring tied to verification failures.

## 7) AWS Bedrock Knowledge Bases

### Method: Multi-KB Budget Router with Trust Dominance (MBRTD)

**Sidestep:** Route across KBs/tools with latency/cost constraints and a trust-dominance rule where high-trust sources cannot be overridden.

**Specification**

- Each source profile: `{p95_ms, cost, trust_floor, domains}` with live telemetry.
- Router solves constrained selection; fusion honors trust dominance and emits compliance proofs.
- Supports partial answers when constraints block low-trust sources.

**Pseudocode**

```pseudo
Plan(query, C):
  S = CandidateSources(query.domain)
  P = ConstrainedSelect(S, max_ms=C.ms, max_cost=C.cost)
  return P

Execute(P):
  ev = ParallelRetrieve(P)
  return Fuse(ev, rule="trust_dominance")
```

**Interfaces**

- `POST /v1/router/plan`
- `POST /v1/router/execute`
- `GET /v1/router/sources/{id}` (telemetry + trust)

**Complexity**

- Planning `O(m log m)` for `m` sources; execution bounded by selected sources; fusion `O(k log k)` for `k` evidences.

**Integration (Summit | IntelGraph | MC)**

- IntelGraph: source profiler + router; trust telemetry store.
- MC: uses router plan as agent scaffold; enforces trust dominance.
- Summit: cost/latency/trust compliance report per question.

**Claim surface (draftable)**

- Independent A: Multi-source router optimizing latency/cost under trust floors and dominance rules.
- Independent B: Fusion engine that suppresses lower-trust evidence when conflicts exist.
- Dependent (8): (1) domain-aware source filtering, (2) live telemetry updates to profiles, (3) budget-aware partial answers, (4) regulator-mode enforcing high-trust-only, (5) per-tenant trust policies, (6) provenance-weighted fusion, (7) auto-blacklist on repeated violations, (8) explanation narratives citing trust dominance decisions.

## 8) Google Vertex AI Search/Grounding

### Method: Conflict Graph Grounding with Abstention (CGGA)

**Sidestep:** Instead of more citations, output a conflict graph and require resolution or abstention when evidence disagrees.

**Specification**

- Extract claims from evidence; add conflict edges for contradictions; cluster conflicts.
- Detect high-conflict clusters; emit abstain responses with clarifying questions.
- Store conflict edges in graph for reuse and learning.

**Pseudocode**

```pseudo
Ground(query):
  ev = RetrieveTiered(query)     # internal + external
  claims = ExtractClaims(ev)
  G = BuildConflictGraph(claims)
  if HasHighConflict(G): return AbstainWithQuestions(G)
  return AnswerWithEvidence(ev)
```

**Interfaces**

- `POST /v1/grounding/cgga` → `{answer|abstain, conflicts, questions, evidence}`
- `GET /v1/conflicts/{claim_id}`
- `POST /v1/conflicts/resolve`

**Complexity**

- Claim extraction `O(len(ev))`; conflict graph build `O(#claims log #claims)`; clustering `O(c log c)`.

**Integration (Summit | IntelGraph | MC)**

- IntelGraph: conflict edges stored as graph facts; feedback loop for claim quality.
- MC: uses questions to trigger follow-up tools; abstention respects governance.
- Summit: “sources disagree” visualization + conflict explorer.

**Claim surface (draftable)**

- Independent A: Grounding engine that constructs a conflict graph and abstains when conflict exceeds thresholds.
- Independent B: Clarification-question generator tied to conflict clusters for follow-up retrieval.
- Dependent (8): (1) confidence-weighted conflict edges, (2) temporal conflict detection, (3) source reputation factors, (4) policy-driven abstention thresholds, (5) regulator-mode mandatory abstention, (6) incremental conflict decay over time, (7) conflict-aware prompt augmentation, (8) analyst feedback loop for conflict resolution.

## 9) Elastic (Retriever Trees)

### Method: Graph-Conditional Retriever Compilation (GCRC)

**Sidestep:** Compile retriever trees conditioned on graph hypotheses (entity type, relationship priors, time windows) instead of doc-centric trees.

**Specification**

- Fast hypothesis pass (NER + graph priors) selects retriever tree template with budgets.
- Executions record “why this branch” rationale derived from hypotheses.
- Stage budgets enforced for latency and token costs.

**Pseudocode**

```pseudo
Execute(query):
  hyp = FastHypothesize(query)          # NER + graph priors
  tree = CompileRetrieverTree(hyp)
  hits = RunRetrieverTree(tree, query)
  return Emit(hits, rationale=hyp)
```

**Interfaces**

- `POST /v1/retrievers/gcrc/execute`
- `GET /v1/retrievers/gcrc/templates`
- `POST /v1/retrievers/gcrc/hypotheses/feedback`

**Complexity**

- Hypothesis `O(len(query))`; tree compile `O(h)`; retrieval bounded by stage budgets; rationale emission `O(k)` hits.

**Integration (Summit | IntelGraph | MC)**

- IntelGraph: hypothesis engine; caches priors; logs rationale.
- MC: reuses hypotheses to choose downstream tools.
- Summit: branch rationale UI with graph priors.

**Claim surface (draftable)**

- Independent A: Retriever-tree compiler conditioned on graph-derived hypotheses.
- Independent B: Retrieval response that includes branch rationale linked to hypotheses and budget enforcement.
- Dependent (8): (1) time-window hypothesis injection, (2) entity-type-specific retriever stages, (3) relation-prior weighting, (4) adaptive budget reallocation, (5) cache warming by hypothesis type, (6) analyst feedback improving priors, (7) regulator-mode with stricter budgets, (8) conflict-aware hypothesis pruning.

## 10) Splunk AI Assistant for SPL

### Method: Evidence-Bound Query Synthesis (EBQS)

**Sidestep:** Do evidence→SPL with clause-level bindings so every filter/join is justified and safe, instead of plain NL→SPL.

**Specification**

- IntelGraph resolver pulls evidence atoms: indexes, sourcetypes, fields, entity sets, time windows.
- Compiler emits SPL with guardrails and binds each clause to evidence ids.
- Run API returns results plus clause bindings for audit.

**Pseudocode**

```pseudo
Synthesize(intent, ctx):
  hyp = ResolveFromGraph(intent, ctx)
  ast = BuildQueryAST(hyp)
  EnforceGuards(ast, allow_indexes=hyp.indexes, max_range=ctx.max_range)
  spl = EmitSPL(ast)
  return spl, BindClauses(ast, hyp.evidence_ids)
```

**Interfaces**

- `POST /v1/query/synthesize?sink=spl`
- `POST /v1/query/run` → `{results, clause_bindings, audit}`
- `GET /v1/query/bindings/{id}`

**Complexity**

- Resolve bounded by graph expansions; compile `O(#clauses)`; run cost depends on SPL engine; binding emission `O(#clauses)`.

**Integration (Summit | IntelGraph | MC)**

- IntelGraph: resolver + compiler; stores bindings for replay.
- MC: agent chain “retrieve evidence → synthesize → run → validate”.
- Summit: clause-to-evidence explainability in UI.

**Claim surface (draftable)**

- Independent A: Query synthesis that binds each SPL clause to graph-derived evidence identifiers.
- Independent B: Execution/audit pipeline that returns clause bindings with results for verification.
- Dependent (8): (1) index allowlist enforcement, (2) time-range guardrails, (3) PII-aware redaction of bindings, (4) GPU/compute budget hints, (5) offline bundle for audit, (6) mutation-prevention on search, (7) clause-level confidence scoring, (8) SOC-mode requiring dual approval for dangerous clauses.

## 11) Stardog / RelationalAI (Reasoning / Inference)

### Method: Proof-Carrying Rule Materialization (PCRM)

**Sidestep:** Return minimal proof objects (support sets) for inferred facts tied to provenance snapshots instead of opaque reasoning.

**Specification**

- Each inferred fact ships with minimal support set `S` and snapshot commitment.
- Proof extractor enforces size/time budgets; proofs cached for reuse.
- Summit renders “why this inference holds”; MC can demand proof for high-stakes steps.

**Pseudocode**

```pseudo
Infer(query, snapshot):
  facts = RunRules(query, snapshot)
  for f in facts:
    S = ComputeMinimalSupport(f)
    Emit(f, proof=S, snapshot_id=snapshot.id)
```

**Interfaces**

- `POST /v1/reasoning/query_with_proofs`
- `GET /v1/proofs/{fact_id}`
- `POST /v1/proofs/verify`

**Complexity**

- Inference depends on rules; proof extraction bounded per fact by max-proof budget; verification `O(|S|)`.

**Integration (Summit | IntelGraph | MC)**

- IntelGraph: proof store + snapshot commitments; cache for reuse.
- MC: “require proofs” mode for decisions and tool calls.
- Summit: inference proof explorer with support sets.

**Claim surface (draftable)**

- Independent A: Reasoning engine that emits inferred facts with minimal proof sets bound to snapshots.
- Independent B: Proof verification workflow that enforces proof size/time budgets before use in downstream steps.
- Dependent (8): (1) incremental proof caching, (2) snapshot commitment anchoring, (3) redacted proof views by role, (4) dual-graph (asserted + inferred) consistency checks, (5) time-windowed inference pruning, (6) hardware-accelerated proof extraction, (7) LLM-explained proofs linked to formal sets, (8) attested proof bundles for offline review.
