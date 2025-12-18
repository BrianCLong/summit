# Summit 2026 Human-AI Collaborative Intelligence Roadmap (OSINT/CTI/Narrative)

- Format: Staff+ briefing; bullets/tables only; deployable-first; trust-by-design.
- Mission: Weaponize 2024–2025 breakthroughs into defensible capabilities on Summit's Neo4j + narrative sim core.
- Constraints: on-prem first (Llama3.1/Mistral, local embeddings), graph provenance for all AI outputs, Grafana p95<2s, human validation >85%, adversarially hardened, make up-graphrag smoke green in <5min.

## 3–5 Defensible Capabilities (build order = phases)

### 1) GraphRAG Hypothesis Tester
- VALUE: NLQ → Cypher traversal → LLM synthesis → narrative injection for rapid CTI/OSINT courses of action.
- WHY-NOW: GraphRAG/KG-LLM surge (attack-path reasoning, anomaly synthesis) aligns with Summit Neo4j core.
- V0/V1 BUILD (4–8wks):
  - NEO4J: `Finding`, `Entity`, `Signal`, `NarrativeEvent`, `Hypothesis` nodes; rels `(:Entity)-[:MENTIONS]->(:Signal)`, `(:Hypothesis)-[:SUPPORTS]->(:Finding)`; indexes on `Signal.hash`, `Entity.canonical_id`, `Hypothesis.id`; constraint unique `NarrativeEvent.id`.
  - GRAPHQL: types `Hypothesis`, `NarrativeEvent`, union `InvestigationNode`; resolvers for `nlqCypher(query)`, `generateHypothesis(entityIds, signals)` returning graph IDs + provenance.
  - UI: React hook `useGraphHypothesis(query)`, Cytoscape layer for hypothesis paths, compact NLQ panel with provenance chips, one-click "inject to sim" button.
  - COPILOT: Prompt chain `NLQ → Cypher draft → safety lint → exec → synthesize summary → provenance map`; route to on-prem Llama3.1; fallback small model for Cypher lint.
  - NARRATIVE: Sim tick hook `onHypothesisInjection(hypothesisId)` creates `NarrativeEvent` arcs; event propagation weight tuned by hypothesis confidence.
  - METRICS: Grafana panels: NLQ latency p95<2s; hypothesis acceptance >85%; provenance coverage 100%; Cypher error rate <3%.
- HUMAN-AI LIFT: Analyst approves Cypher + synthesis; UI shows confidence bands + alt paths; quick-edit Cypher cell; handoff tasks: AI drafts, human curates arcs.
- GOVERNANCE: Every hypothesis stores `source_query`, `model_version`, `execution_hash`; signed provenance chain; audit log for injections; safety filter for disallowed Cypher patterns.
- TRADEOFFS: On-prem Neo4j + Llama3.1 vs cloud acceleration; explainability enforced via graph provenance even if slower; optional Redis cache for NLQ autocomplete.

### 2) Disinfo ThreatNet (Real-time Deepfake/Disinfo OPS)
- VALUE: Automated detection + response graph for deepfakes/narratives; pushes counter-messaging arcs within minutes.
- WHY-NOW: AI-OSINT platforms delivering synthetic media at scale; need real-time graph defense and narrative counterforce.
- V0/V1 BUILD (4–8wks):
  - NEO4J: Nodes `MediaAsset`, `SourceHandle`, `NarrativeCluster`, `CounterMeasure`; rels `(:MediaAsset)-[:CLAIMS]->(:NarrativeCluster)`, `(:CounterMeasure)-[:TARGETS]->(:NarrativeCluster)`; vector index on `MediaAsset.embedding`; timeseries edge attrs for velocity.
  - GRAPHQL: queries `suspectMedia(hash|url)`, `narrativeCluster(id)`, mutation `deployCounter(counterId, clusterId)`; subscriptions `narrativeDrift(clusterId)` via TimescaleDB triggers.
  - UI: React `DisinfoOpsBoard` with Cytoscape threat map; triage queue with ASR/text/vision confidence badges; countermeasure playbook selector; live drift sparkline.
  - COPILOT: Multimodal chain (audio/vision/text) → local embeddings → threat classification → suggested counter; prompt guard for hallucinated claims; route to Mistral for speed.
  - NARRATIVE: Event injector `onCounterDeploy` adds positive/negative sentiment arcs; tick-based decay for stale assets; what-if replay slider.
  - METRICS: p95 ingest→alert <60s; counter deploy median <2m; precision/recall dashboards; red-team disinfo injection detection rate >90%.
- HUMAN-AI LIFT: Human validates counter before deploy; AI clusters assets, proposes playbook; uncertainty ribbon on confidence; manual override for blast radius.
- GOVERNANCE: Provenance chain from asset hash → detector model → cluster ID; watermark verification logs; abuse throttle; C2PA bridge hooks.
- TRADEOFFS: On-prem multimodal slower but compliant; GPU sizing vs throughput; Redis stream buffering vs pure DB triggers.

### 3) Workcell Copilot Orchestrator
- VALUE: Human-AI work orchestration for OSINT/CTI tasks with optimal handoffs and confidence-aware UX.
- WHY-NOW: Human-AI symbiosis research shows productivity gains from structured delegation and uncertainty displays.
- V0/V1 BUILD (4–8wks):
  - NEO4J: `Task`, `Playbook`, `Workcell`, `Reviewer` nodes; rels `(:Task)-[:RUNS_WITH]->(:Workcell)`, `(:Task)-[:REQUIRES]->(:Reviewer)`; indexes on `Task.status`, `Workcell.capability`.
  - GRAPHQL: mutations `proposeTask(input)`, `assignWorkcell(taskId, capability)`, `routeReview(taskId)`; subscription `taskState(taskId)`.
  - UI: `WorkcellConsole` React view; timeline of AI vs human steps; confidence pill and SLA countdown; drag/drop reassignment.
  - COPILOT: Policy-aware router → selects model/agent based on capability and sensitivity; prompt templates embed SLA + provenance requirements.
  - NARRATIVE: Each task completion emits `NarrativeEvent` with impact weight; simulation adjusts scenario outcomes based on task latency and confidence.
  - METRICS: SLA adherence (>90%), human validation rate >85%, p95 task routing <1.5s; adoption velocity dashboard (tasks/week/user).
- HUMAN-AI LIFT: AI drafts outputs; human gates high-risk actions; uncertainty visualized per step; reversible actions with rollback plan surfaced.
- GOVERNANCE: Immutable audit for assignments; policy checks before model call; data minimization guardrails; prompt leak scanner for inputs.
- TRADEOFFS: On-prem routing may limit external model quality; explainability-first UI may slow power users; caching of playbooks vs freshness.

### 4) Provenance Ledger & Risk Scoring
- VALUE: End-to-end intel provenance with privacy/adversarial risk scoring powering trust and compliance.
- WHY-NOW: Governance 3.0 patterns (provenance chains, privacy scoring) are maturing; regulators demanding auditability.
- V0/V1 BUILD (4–8wks):
  - NEO4J: `ProvenanceNode`, `Evidence`, `RiskScore`, `Policy` nodes; rels `(:Evidence)-[:DERIVES_FROM]->(:ProvenanceNode)`, `(:ProvenanceNode)-[:EVALUATED_AS]->(:RiskScore)`; constraints unique `Evidence.id`; index `RiskScore.type`.
  - GRAPHQL: query `provenanceChain(objectId)`, `riskScores(objectId)`, mutation `recordEvidence(input)`; interface `Traceable` to link any node ID.
  - UI: `ProvenanceDrawer` component; breadcrumb chain, risk radar chart; export to PDF/JSON; filter by model version/time.
  - COPILOT: Auto-attach provenance metadata to every response; risk explainer prompt citing graph nodes; local LLM summarizer for audits.
  - NARRATIVE: Sim weights events by risk score; governance ticks pause/slow propagation when risk exceeds threshold.
  - METRICS: % responses with complete provenance (target 100%); risk scoring latency p95<1s; audit export success rate 99%.
- HUMAN-AI LIFT: Analysts see lineage + confidence before acting; can flag dubious edges; AI suggests remediation paths.
- GOVERNANCE: Signed hashes, tamper-evident ledger (Timescale + Neo4j); red-team hooks; role-based access for sensitive evidence.
- TRADEOFFS: Strong provenance may add latency; on-prem crypto/signing overhead; optional batched writes vs immediacy.

### 5) Adversarial Resilience & Red-Team Harness
- VALUE: Continuous hardening against disinfo injection, prompt leaks, model poisoning for mission-critical ops.
- WHY-NOW: Rising attack surface from AI-integrated intel stacks; orgs demanding provable robustness.
- V0/V1 BUILD (4–8wks):
  - NEO4J: `AttackPattern`, `TestCase`, `Vulnerability`, `Mitigation` nodes; rels `(:TestCase)-[:EXERCISES]->(:AttackPattern)`, `(:Mitigation)-[:COVERS]->(:Vulnerability)`; index `TestCase.tag`.
  - GRAPHQL: queries `redteamSuites`, `attackCoverage(tag)`, mutation `runSuite(id)` emitting results to Timescale; subscription `suiteStatus`.
  - UI: `RedTeamDashboard` with coverage heatmap, recent failures stream, drilldowns into prompt leak cases; one-click rerun.
  - COPILOT: Generates variant attacks from seed patterns; routes to isolation sandbox; summarizer produces mitigation diffs.
  - NARRATIVE: Failed tests inject "threat" arcs affecting scenario stress scores; mitigations reduce propagation weights.
  - METRICS: Coverage >90% of critical patterns; mean time-to-mitigate <48h; model prompt-leak regression rate <2%.
- HUMAN-AI LIFT: Human approves mitigations; AI proposes fixes; uncertainty shown on exploitability; scheduled vs on-demand runs.
- GOVERNANCE: Results immutably logged; policy gates before prod deployment; secrets scrubber; change review required.
- TRADEOFFS: On-prem sandbox capacity vs speed; thorough explainability may slow iteration; resource spikes during campaigns.

## Roadmap Phases & Branching
- PHASE 1 (2–4wks): Collab primitives to ship analyst ROI fast (Workcell Copilot Orchestrator V0, initial provenance drawer). Branch: `git checkout -b feat/collab-primitives`.
- PHASE 2 (8–12wks): GraphRAG + narrative moat (GraphRAG Hypothesis Tester, Disinfo ThreatNet, provenance hardening). Branch: `git checkout -b feat/graphrag-narrative`.
- PHASE 3 (post-gates): Autonomous bets gated by governance validation (Adversarial Resilience harness expansion + autonomous playbooks). Branch: `git checkout -b feat/autonomy-gated`.

## Dependencies & Deployability
- Data layer: Neo4j + pgvector/Redis/TimescaleDB; ensure `make up-graphrag` smoke green; seed canonical entities.
- API: GraphQL schemas above; maintain backward compatibility via unions/interfaces; ensure p95<2s.
- UI: React/Cytoscape layers; Copilot surface standardized; instrument with Grafana/Loki traces.
- Models: On-prem Llama3.1/Mistral with local embeddings; routing policy stored in graph; offline fallbacks.
- Observability/SLOs: Grafana dashboards per capability; alerts for latency, provenance completeness, validation rate.
- Security: Default to least privilege; red-team harness integrated; privacy risk scoring before external sharing.
