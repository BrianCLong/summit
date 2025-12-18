# IntelGraph + Narrative Simulation: 2025 Research-Driven Capabilities

Summit context: Neo4j graph core with pgvector/Redis/TimescaleDB, GraphQL API + React + real-time collaboration, AI copilot, and a tick-based narrative simulation engine. Objective: deliver analyst-grade OSINT/CTI/narrative intelligence workflows that stay deployable under partial connectivity and governed for provenance, audit, and mission safety.

## Capability 1 — GNN-augmented Narrative Integrity Scoring
- **Value**: Quantifies the reliability and manipulation risk of social narratives and sources before they are injected into simulations or briefings.
- **Timeliness**: Aligns with 2024–2025 graph-based misinformation and bot detection research (graph neural diffusion, cascade modeling) and rising narrative warfare concerns in geopolitics.
- **v0/v1 (4–8 weeks)**:
  - **Graph**: Add `Narrative`, `StoryArc`, `Propagation`, and `Actor` relationship properties for bot-likelihood, coordination score, and anomaly flags; store GNN outputs as vector embeddings in pgvector and Neo4j properties.
  - **API**: GraphQL queries/mutations to fetch/update integrity scores and provenance; batch scoring endpoint for new collections.
  - **UI**: Analyst panel showing integrity heatmaps and propagation trees; copilot prompt templates for "assess narrative integrity"; export to reports.
  - **Narrative Engine**: Pre-injection guardrail that gates low-integrity arcs; tick-level decay and alert triggers when integrity drops below thresholds.
- **Workflow fit**: Integrity scores surface on alert triage boards and decision dashboards, with drill-down to source chains and narrative evolution; triggers follow-on tasks (fact-check, dampen, or simulate counter-narrative).
- **Governance/controls**: Provenance-tracked features and model versions; audit log of score changes; uncertainty ribbons on UI; policy flags to block simulation of low-trust narratives without analyst override.

## Capability 2 — Agentic OSINT Triage Copilot → Graph Investigations + Narrative Seeds
- **Value**: Converts raw OSINT/SOC alerts into structured graph investigations and seed scenarios that analysts can simulate or brief immediately.
- **Timeliness**: Mirrors the 2025 push toward agentic SOC-style workflows and collaborative, open-weight model orchestration instead of single black-box LLMs.
- **v0/v1 (4–8 weeks)**:
  - **Graph**: Templates for Investigation nodes linking Observations → Entities → Hypotheses → Tasks; enrichment slots for pgvector similarity hits and Redis cached snippets.
  - **API**: Mutation to spawn an investigation from an alert feed; subscription for multi-analyst co-edit; action endpoints to kick off enrichers (WHOIS, malware, social handle clustering) via existing services.
  - **UI**: Copilot action "triage + graph" with guided checklists; split-pane graph + narrative seed composer; assign tasks to teammates in real time.
  - **Narrative Engine**: Auto-generate initial arcs from investigation hypotheses; allow event injection from live enrichments.
- **Workflow fit**: Lives in the main triage board; one-click escalate to simulation or publish to dashboards; tasks and arcs flow into decision intelligence views with status and ownership.
- **Governance/controls**: All agent actions logged with data lineage; per-enrichment provenance and confidence; rate limits and content-safety filters on external fetches; manual approval gates before publishing narratives.

## Capability 3 — Open-weight Multi-Model Orchestrator for CTI Playbooks
- **Value**: Reliable, cost-controllable playbook execution that chains specialized open models (NLP, OCR, translation, code) with deterministic tools for evidence gathering.
- **Timeliness**: Tracks 2024–2025 emphasis on open, system-level AI ecosystems and collaborative tooling instead of closed monoliths.
- **v0/v1 (4–8 weeks)**:
  - **Graph**: Store Playbook, Step, ToolCall, and Evidence nodes with execution traces; model/weight provenance captured per step.
  - **API**: GraphQL mutations to run/preview playbooks; event stream of step completions; policy-aware router selecting models based on data sensitivity/connectivity.
  - **UI**: Playbook composer with fallback chains and offline-safe steps; execution timeline with log/metric overlays; quick-pick templates for malware triage, persona clustering, and takedown packages.
  - **Narrative Engine**: Convert completed playbooks into narrative timelines and inject signals (success/failure, dwell time) as simulation events.
- **Workflow fit**: Embedded in analyst dashboard as “Run playbook” actions tied to alerts/entities; outputs feed integrity scoring and narrative seeds automatically.
- **Governance/controls**: Strict provenance (model hash, config, tool versions), reproducibility bundles, and attested outputs; policy guardrails to block disallowed models/regions; uncertainty + gap annotations in reports.

## Capability 4 — Narrative Propagation Early-Warning & Decision Board
- **Value**: Detects fast-moving or coordinated narratives, estimates impact, and prescribes counter-actions linked to playbooks and simulations.
- **Timeliness**: Leverages graph-based cascade detection and botnet coordination research alongside decision intelligence dashboards that connect alerts→intel→action.
- **v0/v1 (4–8 weeks)**:
  - **Graph**: `PropagationWindow` and `Cluster` nodes with burst/velocity metrics; cross-platform entity linking; TimescaleDB backfill for temporal features.
  - **API**: Streaming subscriptions for new bursts; mutations to launch counter-narrative simulations; hooks to alerting/notifications.
  - **UI**: Decision board showing propagation speed, likely reach, integrity overlays, and recommended countermeasures; "what-if" sliders to simulate interventions.
  - **Narrative Engine**: Ingest live burst data as event injections; run short-horizon sims with counter-action levers; emit predicted reach/decay curves.
- **Workflow fit**: Primary dashboard view for leadership and mission teams; integrates with triage and playbook execution to assign actions and track outcomes.
- **Governance/controls**: Alert fatigue controls (cooldowns, deduplication), confidence intervals on reach/velocity, red-team prompts to stress-test suggested actions, and audit logs for intervention decisions.

## Phased Roadmap
- **Phase 1 (fastest value, leverage existing graph/sim)**: Capability 2 (Triage Copilot) and Capability 1 (Integrity Scoring) — immediately improves alert→graph→sim flow and injects governance via provenance and integrity gating.
- **Phase 2 (platform leverage + defensibility)**: Capability 4 (Propagation Early-Warning Board) — differentiates with graph + sim coupling and decision intelligence dashboards.
- **Phase 3 (system resilience + cost control)**: Capability 3 (Open-weight Orchestrator) — hardens execution, lowers cost, and keeps deployments sovereign/offline-friendly while feeding playbook outputs back into graph and simulation loops.
