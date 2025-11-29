# Summit Human-AI Collaborative Intelligence: 2024–2025 Capability Priorities

## Prioritized Capabilities (next 3–5)

1) **GraphRAG Threat Hypothesis Lab**
   - **Value prop:** Copilot-grounded, live graph reasoning that lets analysts probe attack paths and adversary campaigns with reproducible, graph-backed hypotheses.
   - **Research timeliness:** Aligns with KG+LLM threat modeling and GraphRAG advances for cyber defense and attack-path inference.[1][2][3][4][5]
   - **v0/v1 spec (4–8 weeks):**
     - Neo4j: add `Hypothesis`, `Evidence`, `Confidence` nodes/edges; path scoring properties; timeseries edges into TimescaleDB for hypothesis decay.
     - GraphQL: resolvers for graph traversal templates (attack-path BFS/DFS + risk scoring); mutation to persist hypothesis sessions; vector backfill via pgvector for entity disambiguation.
     - UI: React “Threat Lab” pane with saved graph probes, path overlays, and inline copilot ask/answer; export to report packages.
     - Copilot: retrieval chain that executes Cypher templates → LLM synthesis → cites graph paths; narrative sim hook to auto-seed ticks from hypothesis deltas.
     - Metrics: Grafana dashboards for traversal latency, path-depth distribution, confidence calibration, trust score (>0.8) over user ratings.
   - **Human-AI collab lift:** Task handoff via saved probes; inline reasoning traces (Cypher + scoring); slider for uncertainty thresholds; analyst can override edge weights with rationale logging.
   - **Governance:** Provenance chain (Cypher query + dataset hash) per hypothesis; opt-out flags for sensitive nodes; audit log of copilot prompts; misuse detector for exfil/dual-use queries.

2) **Autonomous OSINT Collection & Deepfake Sentinel**
   - **Value prop:** Continuous OSINT harvesting with authenticity scoring to keep KGs current while filtering synthetic media at ingest.
   - **Research timeliness:** Reflects 2025 AI-OSINT automation, market-scale platforms, and deepfake detection requirements.[6][7][8][9][10]
   - **v0/v1 spec (4–8 weeks):**
     - Pipelines: worker cron to run source connectors; Redis streams for ingest queue; TimescaleDB for freshness SLAs.
     - Models: on-prem Llama3.1 for entity/event extraction; local deepfake detector (e.g., RWKV/C2PA metadata) with confidence output.
     - Neo4j: `Source`, `MediaAsset`, `AuthenticitySignal` nodes; edges to `ProvenanceLedger`.
     - GraphQL/UI: “OSINT Feeds” view with authenticity badges, freshness heatmap, and suppression/allowlist controls.
     - Copilot: auto-summarize new clusters into threat briefs; flag low-confidence media for human review.
     - Metrics: ingest throughput, freshness <2h, detector precision/recall panels, trust score feedback.
   - **Human-AI collab lift:** Human-in-the-loop review queue for uncertain media; explainability cards showing detector signals; quick actions to reclassify or escalate to narrative sim.
   - **Governance:** Mandatory provenance capture (URL, hash, detector version); opt-out and source-block lists; anomaly detector for mass scraping misuse; red-team prompts to detect policy bypass.

3) **Analyst Work-Companion & Decision-Support UX**
   - **Value prop:** Embedded co-pilot that shares workspace context, suggests next-best-actions, and co-authors intel products with transparent rationale.
   - **Research timeliness:** Mirrors human-AI symbiosis and work-companion findings on when collaboration beats solo agents.[11][12][13][14]
   - **v0/v1 spec (4–8 weeks):**
     - Neo4j: `Task`, `PlaybookStep`, `Finding` nodes linked to analysts and sessions; session-context embeddings in pgvector.
     - GraphQL/UI: sidekick panel with action recommendations; collaborative editing of reports; templated “decision frames” with pros/cons and risk bars.
     - Copilot: blends graph context + doc history; offers counterfactuals; can request human confirmation on high-uncertainty suggestions.
     - Narrative sim: allow sidekick to instantiate sim branches from decision frames to preview outcomes.
     - Metrics: suggestion acceptance rate, latency <2s, trust score >0.8, decision-cycle time deltas.
   - **Human-AI collab lift:** Explicit handoff states (AI proposes → human approves/edits); visible uncertainty and rationale chains; “why this next step” explanations; undo/rollback for AI edits.
   - **Governance:** Role-based constraints on actions; immutable decision logs; provenance for AI-authored text; bias/overreach detector that flags overconfident recs.

4) **Provenance-First Intel Products & Privacy Guardrails**
   - **Value prop:** Default-verifiable outputs that encode data lineage, consent/opt-out, and usage constraints to unlock trustable sharing across orgs.
   - **Research timeliness:** Aligns with second/third-gen OSINT governance, privacy paradox debates, and automated KG provenance trends.[15][16]
   - **v0/v1 spec (4–8 weeks):**
     - Neo4j: `ProvenanceLedger` + `Consent` nodes; edges to all `Finding`/`MediaAsset`; cryptographic hashes stored in Redis or pgcrypto.
     - GraphQL/UI: export intel packages with embedded provenance manifests (JSON-LD); privacy policy viewer; consent status badges.
     - Copilot: auto-include citations and consent statuses in narratives; alerts if sources violate opt-outs.
     - Metrics: provenance coverage %, consent-compliance incidents, export verification latency.
   - **Human-AI collab lift:** Analysts can inspect lineage per paragraph; AI highlights missing citations; collaborative redaction workflow with preview.
   - **Governance:** Opt-out enforcement at query time; audit hooks on exports; misuse detector for privacy-violating joins; signed manifests (C2PA bridge ready).

5) **Narrative Simulation + GraphRAG Co-Evolution**
   - **Value prop:** Closed-loop sims that update the KG and copilot prompts as scenario ticks progress, enabling rapid what-if exploration.
   - **Research timeliness:** Combines GraphRAG, attack-path modeling, and narrative engines to anticipate adversarial moves.[1][2][3][4][5]
   - **v0/v1 spec (4–8 weeks):**
     - Neo4j: `Scenario`, `Tick`, `Outcome` nodes; edges into live operational graph; simulate edge deltas stored in TimescaleDB for replay.
     - GraphQL/UI: scenario designer with tick timeline; “apply deltas to KG” control; overlays in graph viewer showing projected vs observed.
     - Copilot: uses GraphRAG to contrast simulated and live paths; suggests countermeasures; generates post-action reports with citations.
     - Metrics: sim-to-reality divergence, tick processing latency, actionability score from analyst feedback.
   - **Human-AI collab lift:** Human curates sim assumptions; AI proposes interventions and highlights uncertainty; shared control to accept/reject deltas into live KG.
   - **Governance:** Provenance of simulated vs real data; guardrails to prevent auto-merge without approval; audit trail of applied deltas; red-team sandbox mode.

## Roadmap Phases

- **Phase 1: Core collab primitives (immediate ROI)**
  - Deliver Work-Companion UX + provenance-first exports; add governance hooks (RBAC, audit, consent nodes); baseline trust dashboards.

- **Phase 2: GraphRAG/narrative amplifiers**
  - Ship GraphRAG Threat Lab and Narrative Simulation co-evolution; integrate OSINT Sentinel signals; expand copilot grounding and explanation UX.

- **Phase 3: Autonomous/scale bets with gating**
  - Scale autonomous OSINT pipelines with strict provenance and opt-outs; enable guarded auto-apply of sim deltas; progressive autonomy toggles with human approval defaults.
