# Summit Agent Stack on IntelGraph

## Overview
This document defines the end-to-end agent architecture for IntelGraph using the Maestro orchestration layer. The stack standardizes planning, tool use, graph-native reasoning, and retrieval-augmented generation (RAG) across three analyst personas: OSINT/influence mapping, threat intelligence and incident triage, and investigative research for policy or geopolitical questions.

## Architecture
- **Maestro Orchestrator**: Central runtime that provides structured planning, tool routing, and execution tracing. Each agent registers capabilities (graph queries, document retrieval, external tools) and exposes deterministic state machines for repeatability.
- **IntelGraph Access Layer**: GraphQL/Gremlin façade for entity/relationship traversal with scoped credentials. Agents must issue read-only graph queries via Maestro tool bindings, using saved query templates for common paths (influence cascades, infrastructure pivots, provenance chains).
- **RAG Plane**: Dual-index retrieval over curated documents and web captures with de-duplication. Uses content hashing to collapse near-duplicate sources before ranking. Supports citation-aware response synthesis with per-source confidence scores.
- **Toolbelt**: Shared actions for enrichment (WHOIS, VT/URLHaus lookups), timeline fusion, clustering, translation/transcription, and fact-level grounding against the provenance ledger.
- **Observability**: All agent runs emit spans, structured logs, and metrics (latency, token use, tool success/failure) to the GA telemetry sink. Safety guardrails log policy decisions for audit.
- **Security/Compliance**: Enforces policy-as-code via the governance engine; no write operations to IntelGraph without explicit human approval. Secrets sourced from the secure broker; temporary credentials rotate per run.

## Agent Blueprints
### 1) OSINT & Influence-Mapping Analyst
- **Goal**: Map narratives, influencers, and propagation channels across open sources.
- **Core steps**:
  - Plan search pivots (entity, hashtag, domain) and bind to web/news/social connectors.
  - Ingest captures into the RAG plane with language normalization and media transcription.
  - Run IntelGraph influence-path templates (k-hop diffusion, community detection seeds).
  - Generate influence maps with confidence scoring and highlight de-duplicated sources.
- **Outputs**: Narrative briefs with source citations, propagation graphs, and risk indicators.

### 2) Threat Intel / Incident-Triage Analyst
- **Goal**: Accelerate triage of security incidents with graph and RAG context.
- **Core steps**:
  - Normalize indicators (hash, domain, IP, TLS cert) and enrich via toolbelt.
  - Traverse IntelGraph for infrastructure reuse, campaign clustering, and attribution hints.
  - Cross-check with RAG evidence (playbooks, prior cases, threat reports) for mitigations.
  - Produce structured incident summaries with containment actions and confidence levels.
- **Outputs**: Triage reports with prioritized actions, related cases, and evidentiary graph paths.

### 3) Investigative Research Assistant (Policy/Geopolitics)
- **Goal**: Compile well-cited analytical briefs grounded in vetted sources.
- **Core steps**:
  - Build a research plan with questions → hypotheses → evidence targets.
  - Retrieve government/think tank documents and trusted captures with de-duplication.
  - Execute IntelGraph provenance traversals to validate sources and actor relationships.
  - Synthesize findings with rationale, source coverage metrics, and divergence notes.
- **Outputs**: Decision-ready briefs with citations, caveats, and alternative hypotheses.

## Orchestration Flow
1. **Intake**: Receive operator intent → generate structured task plan with milestones.
2. **Tool Binding**: Select graph queries, RAG indices, and external tools per milestone.
3. **Execution Loop**: Maestro executes steps with guardrails; retries are bounded and observable.
4. **Evidence Management**: Every response includes citations to graph paths and RAG sources; duplicates collapsed via content hashes and URL canonicalization.
5. **Human-in-the-Loop**: Operators can approve/override plans, pin sources, and request red-teaming; interventions are logged for satisfaction metrics.

## Success Metrics
- **Mean Time-to-Answer (MTTA)**: Target 50% reduction vs. human baseline with p95 < 5 minutes for standard investigations.
- **Source Coverage & De-duplication**: ≥85% unique-source ratio after hashing and canonicalization; duplicate evidence flagged automatically.
- **Operator Satisfaction**: >90% thumbs-up or acceptance rate; interventions tracked per agent and scenario.
- **Reliability**: p95 tool success rate ≥97%; zero untracked tool errors.

## Evaluation & Testing
- **Offline Benchmarks**: Scenario packs for each persona with expected graph paths and reference answers.
- **Live-ops Shadowing**: Compare agent MTTA and actionability against analyst baselines; capture regression data weekly.
- **Guardrail Verification**: Policy-as-code checks before executing graph writes; synthetic tests for RAG citation coverage and deduplication.
- **Telemetry Reviews**: Weekly review of token use, tool latency, and intervention counts to tune planners and caching.

## Implementation Notes
- Reuse Maestro planning primitives and register the three agents as composable workcells.
- Define graph query templates and RAG index schemas under a shared module to avoid drift.
- Store evaluation scenarios and metrics definitions alongside agents for reproducibility.
- Prefer strongly typed tool interfaces and explicit contracts between planner steps and tools.

## Forward Enhancements
- Introduce a **provenance-aware cache** that reuses prior tool invocations when evidence freshness criteria are met.
- Add **multimodal grounding** by attaching structured image/audio transcription outputs into IntelGraph nodes for richer traversal.
- Explore **risk-aware planners** that adjust tool fan-out based on confidence scores and token budgets.
