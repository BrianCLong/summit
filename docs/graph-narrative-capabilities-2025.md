# Summit Graph-Core + Narrative Engine: 2024–2025 Capability Moats

## Capability 1: GraphRAG Attack-Path Hypothesis Workbench
VALUE: NL → Cypher traversals → LLM synthesis → sim injection for faster, higher-confidence CTI paths.
WHY-NOW: GraphRAG + KG-LLM fusion advances (2024–2025) show hybrid traversals outperform plain RAG for cyber graphs.
V0/V1 SPEC (4–8 weeks):
- NEO4J: Add `AttackPath`, `Hypothesis`, `Signal` nodes; constraints on `id`, temporal validity; relationships `(:Indicator)-[:EVIDENCES]->(:Signal)-[:SUPPORTS]->(:Hypothesis)`.
- GRAPHQL: Resolvers for `proposeAttackPath(queryText)`, `rankedHypotheses`, `signalDrilldown(id)`; subscriptions for hypothesis updates.
- UI: React “Hypothesis Lab” panel; Cytoscape overlay rendering candidate paths with confidence heatmap; inline Cypher preview/edit.
- COPILOT: Prompt chain that rewrites NL to Cypher, executes bounded traversals, then fuses results via local Llama3.1 for summaries; fallback to rule-based templates when offline.
- NARRATIVE: Hook to auto-inject top hypotheses as narrative events with likelihood decay per tick; analysts can promote/dismiss.
- METRICS: Grafana panels for hypothesis latency p95<2s, acceptance rate, false-positive rate, Cypher execution errors.
HUMAN-AI LIFT: AI drafts 3 ranked hypotheses; analyst edits Cypher + thresholds; UI shows provenance and uncertainty ribbons.
GOVERNANCE: Store provenance chain (source nodes, Cypher used, model version); signed audit log of edits; guardrail templates to block exfiltration queries.

## Capability 2: Real-Time OSINT Disinfo Sentinel
VALUE: Streaming OSINT ingestion with deepfake/disinfo scoring mapped onto narrative graph to preempt manipulation campaigns.
WHY-NOW: AI-OSINT platforms + deepfake detection research enabling market-scale real-time triage (2025 trend).
V0/V1 SPEC (4–8 weeks):
- NEO4J: Extend `Content`, `Actor`, `Campaign`; add `Detection` node with properties `{score, modality, detector_version}`; relationship `(:Detection)-[:FLAGS]->(:Content)`.
- GRAPHQL: Mutations `ingestContent(batch)`, `scoreDisinfo(contentId)`, query `campaignThreatFeed(limit, filters)`.
- UI: “Disinfo Sentinel” stream view with modality badges; Cytoscape timeline slider to visualize propagation; drilldowns showing detector evidence.
- COPILOT: Routing prompt to choose between vision/audio/text detector chains; summarization prompt that links detections to campaigns; offline mode uses heuristic signatures.
- NARRATIVE: Auto-create narrative events when detection score crosses threshold; injection probability scaled by actor credibility.
- METRICS: Grafana panels for ingest throughput, detector precision/recall (human-validated), p95 scoring latency, alert ACK rate.
HUMAN-AI LIFT: AI clusters flagged content; human labels top-k items to recalibrate detectors; uncertainty bands + “request second opinion” button.
GOVERNANCE: C2PA/C2ID provenance storage; per-detector audit (inputs/weights/version); privacy risk scoring for PII-bearing artifacts; misuse alerts for over-collection.

## Capability 3: Analyst-AI Workcell Orchestrator
VALUE: Human/agent task handoff patterns (triage → enrichment → narrative injection) that cut investigation cycle time.
WHY-NOW: Human-AI symbiosis research shows patterned delegation boosts throughput and quality.
V0/V1 SPEC (4–8 weeks):
- NEO4J: `Workcell`, `Task`, `Assignment` nodes; relationships `(:Task)-[:DEPENDS_ON]->(:Task)`, `(:Workcell)-[:OWNS]->(:Task)`; enforce `status` enums.
- GRAPHQL: Mutations `createWorkcell`, `assignTask(taskId, actorId)`, `handoff(taskId, toActorId)`, queries `workcellState(id)` with task DAG.
- UI: React “Workcell Board” (kanban + DAG view); Cytoscape overlay for dependencies; handoff composer with rationale capture.
- COPILOT: Agent that proposes task graph given objective; model routing between planning LLM (local) and extraction LLM; prompts include cost/latency budgets.
- NARRATIVE: Tasks that reach “done” can emit narrative events; unresolved blockers create low-confidence counterfactual events for review.
- METRICS: Panels for mean handoff time, human acceptance of AI-proposed tasks, investigation completion SLA, p95 planner latency.
HUMAN-AI LIFT: AI drafts task DAG and assigns to agents; human approves/edits; uncertainty badges on AI-suggested owners; reversible handoffs with diff view.
GOVERNANCE: Audit trail of task proposals/approvals; RBAC on assignments; leak-prevention prompts for sensitive objectives; red-team playbook to test prompt leaks.

## Capability 4: Governance & Provenance Ledger for AI Intel
VALUE: End-to-end provenance, risk, and auditability for AI-generated intel powering trust and compliance.
WHY-NOW: OSINT Governance 3.0 trends demand provenance chains, privacy scoring, and ethics labeling for AI outputs.
V0/V1 SPEC (4–8 weeks):
- NEO4J: `Provenance`, `PrivacyRisk`, `Policy` nodes; `(:Provenance)-[:DERIVES_FROM]->(:Content|:Signal|:Detection)`; constraint on hash ids.
- GRAPHQL: Queries `provenanceChain(entityId)`, `riskScore(entityId)`, mutation `attestOutput(entityId, policyId)`; subscriptions for policy violations.
- UI: Provenance side-panel with hop-by-hop graph; risk badge component; policy violation toast stream; export signed attestations.
- COPILOT: Prompt decorator that injects provenance requirements; model selection based on data sensitivity; refusal patterns for policy violations.
- NARRATIVE: Narrative engine consumes provenance hashes to gate event injection; risk>threshold forces human review before advancing ticks.
- METRICS: Panels for provenance coverage %, policy violation rate, time-to-attest, p95 provenance query latency.
HUMAN-AI LIFT: AI drafts provenance + risk labels; human confirms/edits; confidence tooltips + “why am I seeing this?” explainer.
GOVERNANCE: Append-only ledger (pg/Neo4j dual-write); signer keys for attestations; misuse detection for missing provenance; privacy redaction hooks.

## Roadmap Priority
PHASE 1 (2–4 wks): Hypothesis Workbench V0 + minimal Workcell Board to deliver analyst ROI fast.
PHASE 2: Disinfo Sentinel + Governance Ledger wired into narrative engine; tighten p95<2s and trust>0.8 thresholds.
PHASE 3: Autonomous Workcells with guarded narrative auto-injection and full provenance gating; expand detector ensemble and offline modes for air-gapped sites.
