# Summit 2026 Research Agenda: Human-AI Intelligence Infrastructure for OSINT/CTI/Narratives

## Context and Principles
- **Stack leverage (100%)**: Neo4j + pgvector/Redis/TimescaleDB → GraphQL → React/Cytoscape UI → Copilot + Narrative Sim; deployable-first (air-gapped, <5 min make/smoke), Grafana observability.
- **Research signals to product**: GraphRAG/KG-LLM fusion, AI-OSINT evolution, human-AI symbiosis, and Governance 3.0.
- **North-star outcomes**: 50% of copilot queries routed through new capabilities; ≥85% human validation; p95 latency <2s; green in air-gapped mode.

## Capability Portfolio (2026 ship targets)

### 1) GraphRAG Hypothesis Tester (Phase 1, 2–4 wks build → GA)
**Value**: Analysts ask "Is X coordinating Y campaign?" and receive Cypher-backed answers with narrative injection in ~3s.

**Architecture hooks**
- **Neo4j**: `HypothesisResult` nodes; traversal provenance edges; GNN-derived confidence indexes persisted in TimescaleDB for trend tracking.
- **GraphQL**: `hypothesisTest(input: NLQuery!): HypothesisResponse` → `{ cypherQuery, graphSpans, llmSynthesis, confidence, provenance }`.
- **Copilot chain (Llama3.1 local-first)**: NL → Cypher gen → traversal → synthesis → narrative event stub; pgvector stores preference embeddings to learn analyst choices.
- **UI (React/Cytoscape)**: Copilot chat, graph highlight layer, "Why this answer?" popover with audit trail; human sign-off UI when confidence <0.7.
- **Narrative sim**: Auto-inject hypotheses as "pending arcs" with confidence decay; conflicts surface via alert rules.
- **Observability/Governance**: Cypher query audit log, Grafana "hypothesis accuracy" panel; human sign-off gating; p95<2s budget tracked.

**Success gates**: ≥3 ranked hypotheses per query, ≥85% human validation, <2s p95 end-to-end, zero missing audit records.

### 2) Narrative Impact Forecaster (Phase 2, 4–8 wks build)
**Value**: "What if Russian IO campaign hits US midterms?" → simulate 7 days → risk scores + counter-narratives.

**Architecture hooks**
- **Neo4j**: `NarrativeCampaign` nodes; botnet/propagation edges; sentiment decay constraints; TimescaleDB for momentum time-series.
- **GraphQL**: `forecastImpact(campaign: ID!, days: Int!): ForecastResult` → `{ riskScores, counterActions, projectedEntities }`.
- **Narrative engine**: Extend tick loop with propagation physics + GNN momentum; watermark generated narratives; provenance chains to source OSINT.
- **Copilot (Mistral/air-gap compatible)**: Converts risk analysis to 3 counter-narrative event options; supports deterministic fallback rules.
- **UI**: Narrative dashboard with tick-advance slider, impact heatmap overlay, replay/stress-test controls.
- **Observability/Governance**: Grafana "narrative ROI" panel, provenance verification; hallucination guardrails via validator agent.

**Success gates**: Forecast accuracy tracked vs. real events; analyst-accepted counter-actions >70%; p95 <2.5s per tick, watermarks on 100% generated text.

### 3) OSINT Agent Swarm (Phase 3, 8–12 wks build)
**Value**: "Monitor Chinese maritime claims" → 5 specialized agents → unified intel product → graph updates.

**Architecture hooks**
- **Neo4j**: `AgentTrace` nodes; task decomposition and dependency edges; confidence voting metrics; staleness decay on findings.
- **GraphQL**: `spawnAgents(mission: MissionInput!): AgentMission` → `{ agentProgress, unifiedReport, ledgerRefs }`.
- **Copilot**: 5 local Llama3.1 agents (collector/analyzer/validator/synthesizer/auditor) with Redis task queue; auditor enforces privacy boundaries.
- **Narrative sim**: Auto-feed findings as events; decay stale intel; propagation of consensus to campaign momentum.
- **UI**: Mission control board with agent status tiles, merged graph view, conflict resolution prompts; human kill-switch.
- **Observability/Governance**: Agent audit logs to Neo4j + TimescaleDB; Grafana "mission velocity" and consensus dashboards; privacy risk scoring; kill-switch tested.

**Success gates**: Consensus rate >80%; human overrides <15% after first replay; <3s per agent task slot; no privacy violations (auditor zero findings per release gate).

### 4) Governance Fabric (cross-cutting, concurrent with Phases 1–3)
**Value**: Default-secure provenance, risk scoring, and adversarial hardening for all graph + narrative paths.

**Architecture hooks**
- **Neo4j/Prov ledger**: Immutable provenance chains per hypothesis/sim event; C2PA bridge for external ingest; pgvector embeddings for anomaly detection.
- **GraphQL**: middleware for provenance stamps, privacy policy checks, and confidence threshold enforcement.
- **Security**: Adversarial prompt firewall; model swap policy (local vs. cloud) with cost/latency guardrails; differential watermarking across outputs.
- **Observability**: Governance SLOs (provenance coverage, privacy alerts, model drift) surfaced in Grafana; red-team replay packs.

**Success gates**: 100% provenance coverage on generated artifacts; zero P0 privacy alerts; adversarial regression suite green per release.

## Phasing & Delivery
- **Phase 1 (2–4 wks)**: Capability 1 → unlock immediate copilot uplift; ship schema, GraphQL resolvers, copilot chain, UI chat, Grafana panel.
- **Phase 2 (4–8 wks)**: Capability 2 → narrative moat; ship propagation loop, forecasting API/UI, counter-narrative generation, ROI dashboards.
- **Phase 3 (8–12 wks)**: Capability 3 → autonomous mission delivery; ship agent runtime, mission UI, audit/kill-switch; harden governance fabric.
- **Deployment**: Maintain <5 min make/smoke, air-gapped bundles, Grafana dashboards; branch scheme `epic/<capability>` with PRs per layer (Neo4j schema, GraphQL resolvers, copilot chain, UI, observability).

## Forward-Leaning Enhancements
- **GNN-accelerated GraphRAG**: Use vector-indexed motif caching (pgvector + Redis) to pre-materialize common threat patterns; reduces Cypher generation latency and improves recall for hypothesis testing.
- **Counterfactual narrative search**: Integrate beam-search over simulation ticks to surface the minimal intervention set that flips campaign outcome; expose via `forecastImpact` optional parameter `counterfactualDepth`.
- **Adaptive agent budgeting**: Reinforcement-learning policy for agent swarm resource allocation (CPU/memory/LLM tokens) tuned to air-gapped hardware profiles; exposes Grafana cost/latency frontier.

## Success Criteria & Measurement
- 50%+ copilot queries routed through new capabilities; ≥85% human validation; p95 latency targets: 2s (capability 1), 2.5s/tick (capability 2), 3s/task (capability 3).
- Governance coverage: 100% provenance stamps, watermark adherence, privacy alerts = 0 P0 per release.
- Adoption: Analyst NPS +10; reduction in manual OSINT synthesis time by 40%; mission velocity ↑ (agent swarm consensus >80%).
