# Summit Human–AI Collaborative Intelligence: 2025 Capability Bets

## Capability 1: Graph-native Copilot for IntelGraph Interrogation (GraphRAG + structured grounding)
- **Value proposition:** Analysts ask NL questions and receive sourced, graph-grounded answers with path visualizations, making IntelGraph the shared truth layer.
- **Why now:** GraphRAG and threat-KG patterns are proving higher factuality for CTI/OSINT than vanilla RAG; competitors are adding agentic graph copilots but lack transparent pathing.
- **Concrete v0/v1 (4–8 weeks):**
  - Data model: tag graph nodes/edges with `source_uri`, `collection_run_id`, `confidence`, `ttl`; add vector embeddings for entities in pgvector for semantic pivots.
  - GraphQL: `askGraph` mutation that compiles NL → cypher templates → executes Neo4j → fuses with LLM reasoning; returns path, citations, and uncertainty scores.
  - UI: copilot panel that previews generated Cypher, shows top 3 paths, and lets users pin nodes to a working set; inline “why this link” tooltips.
  - Copilot: chain-of-thought hidden, but expose rationale summary; allow analysts to edit prompts/templates.
  - Observability: trace spans for Cypher generation/execution, LLM latency, and grounding success rate; log provenance IDs.
- **Human–AI collaboration:** AI drafts queries and explanations; humans approve/modify Cypher, pin/reject nodes, and teach better templates (learning loop via prompt library diffs); explicit uncertainty surfaces.
- **Governance hooks:**
  - Provenance: enforce `source_uri` and `collection_run_id` on all returned facts; attach C2PA-style signature hash to response bundle.
  - Privacy: filter Cypher templates against org/tenant allowlists; redact PII fields at resolver; on-prem friendly models.
  - Audit: immutable query+response ledger in TimescaleDB with analyst approvals; red-team mode to fuzz prompts for injection.
  - Abuse guardrails: rate-limit `askGraph` per analyst; detect mass-surveillance patterns (broad selectors) and require justification.

## Capability 2: Misinformation/Deepfake Lineage Tracker with Narrative Impact Scoring
- **Value proposition:** Track how suspect media and narratives propagate across sources, score their projected impact, and feed them into the narrative simulator for what-if defenses.
- **Why now:** 2024–2025 OSINT tools race to add deepfake/inauthentic-behavior detection; pairing lineage with narrative sims is still rare and differentiating.
- **Concrete v0/v1 (4–8 weeks):**
  - Data model: new `MediaAsset` and `Narrative` node types with perceptual hashes, model verdicts, and `spread_event` edges; Timescale for time-series volume/velocity.
  - GraphQL: `submitMediaEvidence`, `linkNarrative`, `scoreNarrativeImpact` mutations; subscriptions for burst alerts.
  - UI: timeline of spread events, lineage graph overlay, and simulator hook to run “if counter-message injected” scenarios.
  - Copilot: auto-cluster similar media via embeddings; propose likely origin and amplification vectors; generate analyst-ready briefs.
  - Observability: dashboards for false-positive/false-negative rates by model; alert on anomalous spread velocity.
- **Human–AI collaboration:** AI clusters and scores; humans validate clusters, set thresholds, and choose countermeasures in the sim; explanations show which features drove deepfake verdicts and which nodes drive impact.
- **Governance hooks:**
  - Provenance: store hash chains and model versioning for every verdict; show evidence links in briefs.
  - Privacy: constrain ingestion to approved feeds; strip faces/voices where policy requires; sandbox model inference offline.
  - Audit: decision log of overrides (e.g., human downgrades a deepfake verdict) with rationale.
  - Abuse prevention: detect mass attribution against individuals; require supervisor approval for person-centric tracking.

## Capability 3: Analyst–Agent Workcells with Task Exchange and Explainable Plans
- **Value proposition:** Workcells pair analysts with small agent teams that propose/execute OSINT/CTI playbooks, with explicit task splits and review checkpoints.
- **Why now:** “Work companion” research shows humans+agents outperform solo when tasks are decomposed with transparent plans; market tools are shipping generic agents without plan/approval ergonomics.
- **Concrete v0/v1 (4–8 weeks):**
  - Data model: `Workcell`, `Task`, `Artifact`, `Hypothesis` nodes; edges for `proposed_by`, `approved_by`, `produced`; task state machine stored in Postgres.
  - GraphQL: `createWorkcell`, `proposeTaskPlan`, `approveStep`, `handoffTask`, `scoreHypothesis` mutations; subscriptions for handoff events.
  - UI: plan view showing agent-proposed steps, required approvals, and SLA timers; inline diffs between agent draft and human edits.
  - Copilot: plan generator that cites prior tasks and graph snippets; suggests who should do what (agent vs human) based on risk/ambiguity heuristics.
  - Observability: metrics on plan acceptance rate, rework, and dwell time per step; traces for agent actions.
- **Human–AI collaboration:** Clear task allocation (agent executes low-risk collection; human reviews attribution/conclusions); explanations for each step; learning loop as humans annotate rejections → prompt/heuristic updates.
- **Governance hooks:**
  - Provenance: bind artifacts to collection runs and sources; task ledger with approvals.
  - Privacy: restrict agent access by clearance tags; scrub outputs via policy engine before human handoff.
  - Audit: immutable plan/action log; supervisor view for override.
  - Abuse prevention: cap autonomous breadth (query scope/time); block scraping of protected populations.

## Capability 4: Cross-Source Pattern Radar with Graph + Time Anomaly Detection
- **Value proposition:** Detect emerging TTPs, bot clusters, and infrastructure reuse by fusing graph motifs with time-series anomalies, surfacing early warnings.
- **Why now:** Threat intel platforms are converging on automated pattern detection; graph-motif + temporal anomaly stacking is a leading signal with low vendor penetration.
- **Concrete v0/v1 (4–8 weeks):**
  - Data model: motif catalog nodes (`PatternSignature`) linked to observed entities/flows; Timescale rollups for activity counts.
  - GraphQL: `registerPattern`, `detectEmergence`, `subscribePatternAlerts`.
  - UI: radar dashboard showing motif matches over time, confidence bands, and quick path-to-proof chips.
  - Copilot: natural-language “what changed?” queries; suggests enrichment pulls when confidence is low.
  - Observability: precision/recall tracking against analyst labels; drift alerts for motif embedding models.
- **Human–AI collaboration:** AI proposes pattern matches with confidence and counterfactuals; humans label true/false positives, adjusting thresholds; quick pivot buttons for deeper graph trails.
- **Governance hooks:**
  - Provenance: retain raw hits and filters used; show which feeds contributed to a match.
  - Privacy: exclude protected entities via policy filters; minimize retention windows for benign hits.
  - Audit: trail of suppression/ack actions; red-team mode to test overfitting or data poisoning.
  - Abuse prevention: monitor for broad “bulk surveillance” patterns and require supervisor sign-off.

## Capability 5: Provenance-First Intel Products with Adaptive Transparency Levels
- **Value proposition:** Generate briefs that auto-tune transparency (citations, methods, model caveats) based on audience and sensitivity, maintaining trust and deployability in high-governance settings.
- **Why now:** Customers demand AI-generated intel with verifiable provenance; transparency/learning effects improve human trust and are becoming a differentiator in regulated OSINT/CTI.
- **Concrete v0/v1 (4–8 weeks):**
  - Data model: `IntelProduct` nodes linking to `Evidence` edges carrying C2PA hashes, `confidence`, and `sensitivity` labels.
  - GraphQL: `draftIntelProduct(audienceLevel)`, `setTransparencyPolicy`, `publishIntelProduct`.
  - UI: transparency slider toggling citation density, method cards, and model caveats; export to PDF/JSON with embedded provenance bundle.
  - Copilot: template selector per audience (exec, SOC, partner); calls GraphRAG grounding; flags low-confidence sections.
  - Observability: track usage, trust feedback scores, and sections most frequently overridden by humans.
- **Human–AI collaboration:** AI drafts; humans curate evidence, adjust transparency, and add judgement; system learns preferred evidence patterns; explicit uncertainty and model limits reduce overreliance.
- **Governance hooks:**
  - Provenance: mandatory evidence hashes and source attributions; signed publication artifacts.
  - Privacy: audience-aware redaction policies; block export when evidence sensitivity conflicts with audience level.
  - Audit: publish/diff history; reviewer approvals before external sharing.
  - Abuse prevention: watermark AI-generated content; detect “specious certainty” (overconfident language) and require edits.

## Phased Roadmap
- **Phase 1 (table-stakes differentiation):** Capabilities 1, 3, and 5 — focus on graph-grounded copilot, workcell ergonomics, and provenance-first intel products to beat generic LLM copilots; emphasize governance primitives.
- **Phase 2 (graph+LLM and sim amplifiers):** Capability 2 and 4 — misinformation lineage + narrative impact loops and pattern radar; deepen moat with graph+time analytics and simulator integration.
- **Phase 3 (high-beta, gated):** Extend Capability 3 into semi-autonomous collection agents with bounded scopes; cross-tenant/trend models with strict tenancy isolation; opt-in federated learnings for motif detection; attach enhanced oversight (kill-switches, bias/abuse monitors) before GA.

## Key Trade-offs & Deployment Notes
- **Models:** prefer on-prem open-weight LLM/vision where governance demands; allow hosted fallback with strict logging; expect higher latency but better explainability.
- **Explainability vs. cost/latency:** expose template/Cypher previews and feature importances even if slightly slower; cache stable templates and motif scores to offset cost.
- **Data residency:** ensure pgvector/Timescale shards respect tenant boundaries; graph exports behind RBAC and purpose justification.
- **Simulator fidelity vs. speed:** start with coarse narrative impact scoring to keep v0 real-time; add deeper agent-based sims in Phase 2/3 once governance controls land.
