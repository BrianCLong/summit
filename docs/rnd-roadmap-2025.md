# Summit R&D Roadmap (Agentic AI, Graph Fusion, CTI)

## Phase 1 (0–2 sprints)

### 1) Graph-grounded CTI Copilot for Cross-Feed Correlation
- **Goal:** Multi-agent copilot that fuses IntelGraph entities with live OSINT/CTI feeds to auto-build, justify, and refresh relationship hypotheses for analysts.
- **Why now:** Agentic CTI workflows and graph-LLM fusion are emerging as 2025 best practices for faster triage and reduced hallucinations; aligns with decision-intelligence and cost-aware agent trends.
- **v0/v1 scope (4–8 weeks):**
  - Agent chain: feed fetcher → entity/link normalizer → graph-grounded reasoner → explainer.
  - GraphQL mutation to submit "investigation runs" that capture provenance and cache embeddings in pgvector/Redis.
  - Copilot panel in React to show hypotheses, confidence, provenance edges, and quick-accept/flag actions.
- **Design choices (Summit stack):**
  - Use Neo4j path queries + pgvector similarity search to propose merges; Redis for short-lived agent state.
  - GraphQL subscriptions to stream agent steps; narrative sim engine to render "what-if" link implications.
  - Store all agent prompts/outputs as graph properties for traceability.
- **Governance & safety:**
  - Ground every suggestion with graph node/edge IDs; refuse actions without evidence.
  - Analyst-in-the-loop approvals; automatic hallucination checks against graph/pgvector proximity.
  - Rate-limit and sign feed connectors; redact PII in copilot responses.

### 2) Provenance-first OSINT Ingestion & Fact Ledger
- **Goal:** Turn OSINT captures into signed, versioned fact records linked into IntelGraph with verifiable provenance and freshness policies.
- **Why now:** Knowledge-graph + LLM pipelines are standardizing on provenance ledgers to control hallucinations and defend against adversarial OSINT poisoning; regulators expect auditability.
- **v0/v1 scope (4–8 weeks):**
  - Extend ingest pipeline to emit C2PA/CAB-style evidence bundles; store in prov-ledger schema.
  - GraphQL mutation/query for fact lifecycle (assert/retract/expire) with freshness SLAs.
  - UI badge for trust level and last-verification timestamp on entities/edges.
- **Design choices:**
  - Neo4j relationship types `ASSERTED_BY`, `RETRACTED_BY`, `VERIFIED_BY` with timestamps; Redis TTL watch for expiring facts.
  - pgvector similarity checks to detect duplicate evidence; optional signature verification service.
  - Expose provenance graph slices via GraphQL for the copilot to cite.
- **Governance & safety:**
  - Mandatory source metadata; block ingestion without origin + timestamp.
  - Auto-quarantine conflicting facts; require analyst resolution.
  - Misuse hooks: feed allowlist, content safety classifiers on text/image OSINT before graph insertion.

## Phase 2 (2–4 sprints after Phase 1 validation)

### 3) Multimodal OSINT Agent Cell for Entity & Event Linking
- **Goal:** Agent cell that fuses text, image, and network telemetry into unified entity/event hypotheses grounded in IntelGraph.
- **Why now:** Multimodal OSINT agents with graph grounding are proving more accurate for entity/event reasoning and reduce hallucinations; aligns with 2025 multimodal MLLM adoption.
- **v0/v1 scope:**
  - Add image+text embedding dual-store in pgvector; CLIP/LLM-based extraction agents that propose graph updates.
  - GraphQL job type for "multimodal sweep" that returns candidate merges with evidence snippets and confidence bands.
  - UI diff view to compare proposed merges vs current graph, with side-by-side media/context snippets.
- **Design choices:**
  - Reuse Redis streams for agent orchestration; Neo4j for candidate path scoring; pgvector for cross-modal similarity.
  - C2PA tags passed through ingestion; media hashes stored on edges for dedup.
  - Copilot asks graph-backed clarifying questions before commits to reduce hallucination risk.
- **Governance & safety:**
  - Enforce provenance on every modality; quarantine low-confidence multimodal merges.
  - Human approval gates; watermark generated media; detect and flag likely synthetic assets.

### 4) Red-Team Harness for Copilot and Agents
- **Goal:** Continuous red-team suite that probes copilot/agent chains for prompt injection, data exfiltration, and misinformation behaviors with auto-mitigations.
- **Why now:** LLM security/red-teaming is now table stakes as adversaries weaponize agents; aligns with 2025 misuse-aware design and enterprise governance expectations.
- **v0/v1 scope:**
  - Attack library (prompt injection, data exfil, misinformation) executed against GraphQL ops and copilot endpoints.
  - Safety scorecard dashboard in React; CI gate that fails on new regressions.
  - Auto-patches: stricter context filters, allowlists for tool calls, provenance-required responses.
- **Design choices:**
  - Jest/Playwright harness hitting server GraphQL and copilot API; Redis-backed allowlist for tools; pgvector similarity guardrails to reject off-topic tool use.
  - Observability: structured safety logs, metrics to Prometheus/Grafana.
  - Narrative sim engine seeded with adversarial scripts to test info-ops resilience.
- **Governance & safety:**
  - Auditor mode captures full request/response with signatures; privacy scrubbing for stored logs.
  - Misuse alerts with kill-switch for agent tools; rate limits per identity and IP.

## Phase 3 (option-value bets)

### 5) Cost- and Placement-Aware Agent Orchestration
- **Goal:** Dynamic agent planner that chooses on-prem vs cloud models, retrieval depth, and summarization fidelity based on cost, connectivity, and sensitivity.
- **Why now:** 2025 trend toward cost-aware, deployability-first AI; air-gapped and disconnected ops need graceful degradation; multi-cloud arbitrage for heavy workloads is maturing.
- **v0/v1 scope:**
  - Policy engine that tags jobs as {air-gapped, restricted, open}; routes to local vs hosted LLMs accordingly.
  - GraphQL hints to control recall vs latency; Redis cache for reuse of safe summaries.
  - UI selector for "mode" (secure/local vs expanded/cloud) with expected cost/time bands.
- **Design choices:**
  - Reuse `ga-graphai` orchestration: cost-guard + cloud-arbitrage packages; Neo4j for policy graph (model/data locality edges).
  - pgvector cache of prior summaries; fallback small models for disconnected mode.
  - Observability emits cost/latency per agent tool; circuit breakers on spend/timeouts.
- **Governance & safety:**
  - Default to least-privilege/local mode; enforce provenance even in cloud path.
  - Deny listed tools/models for sensitive tenants; encrypted transit/storage; audit trails for routing decisions.
