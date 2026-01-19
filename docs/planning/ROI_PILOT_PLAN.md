# Pilot Plan: ROI-Driven Agent Deployment (30-60 Days)

This plan supersedes previous H1/H2 priorities to focus on high-ROI "Agentic RAG" and "Operational Agents" based on the [ROI 2025 Assessment](https://cloud.google.com/resources/content/roi-of-ai-2025).

## Strategic Goals

1.  **Deploy "Ask Summit" (Agentic RAG)**: Immediate value via natural language query over `IntelGraph` and Documents.
2.  **Launch Operational Agents**: Reduce manual toil in ingestion and triage.
3.  **Governance Overlay**: Ensure "Glass Box" visibility for all pilot agents.

---

## 30-Day Sprint: "Ask Summit" & Foundation (Weeks 1-4)

### 1. "Ask Summit" Agent (Agentic RAG)
*Target: Enable analysts to ask "What narratives involve entity X?" and get grounded answers.*

- [ ] **IntelGraph Tool for Maestro**: Expose `IntelGraph` Cypher/Vector search as a callable tool for Maestro agents.
    - *Source:* `packages/intelgraph/tools/graph-search.ts`
    - *Action:* Wrap `IntelGraphService.search()` into a Maestro-compatible Tool definition.
- [ ] **Document Store Retrieval Tool**: Create a tool to retrieve context from `rag/` or document stores.
    - *Source:* `server/src/rag/retriever.ts`
- [ ] **"Ask Summit" Orchestrator**: Create a specific prompt/orchestration in Maestro for RAG.
    - *File:* `prompts/agents/ask-summit.md`
    - *Logic:* Plan -> Retrieve (Graph + Docs) -> Synthesize -> cite sources.
- [ ] **Simple UI Integration**: Add an "Ask" input in the Summit global nav or Switchboard.

### 2. Operational Agent: "Triage-1"
*Target: Auto-label incoming feed items with Risk and Topic.*

- [ ] **Ingestion Listener**: Configure a Maestro agent to trigger on new feed items (webhook or poller).
- [ ] **Classification Prompt**: Port existing "Triage" logic to a structured Maestro agent.
- [ ] **Output Action**: Agent updates the `FeedItem` in Postgres/Graph with `suggested_labels` and `risk_score`.

### 3. Basic Governance Overlay (The "Wrapper")
*Target: Every agent run leaves a trace.*

- [ ] **Provenance Logging**: Ensure "Ask Summit" and "Triage-1" write to `ProvenanceLedger` (as defined in Epic 1).
- [ ] **Read-Only Constraint**: Enforce a "Read-Only" scope for the "Ask Summit" agent via OPA or code config.

---

## 60-Day Sprint: Enhancement & Verification (Weeks 5-8)

### 1. Deepening "Ask Summit"
- [ ] **Multi-Hop Reasoning**: Allow the agent to traverse the graph (e.g., "Find neighbors of X, then check their recent reports").
- [ ] **Citation Links**: UI renders clickable links to source graph nodes or docs.

### 2. Operational Agent: "Enricher-1"
*Target: Auto-extract entities from text and link them in the graph.*

- [ ] **Entity Extraction Tool**: Wrap an NER model (or LLM call) as a tool.
- [ ] **Graph Write Tool**: Allow "Enricher-1" to propose new edges/nodes (State: `PENDING_APPROVAL` if high confidence isn't met).
- [ ] **Human Loop**: Connect low-confidence enrichments to `Switchboard` (Epic 2).

### 3. ROI Measurement Dashboard
*Target: Prove value.*

- [ ] **Metrics Collection**: Track "Questions Answered", "Items Triaged", "Human Time Saved" (estimated).
- [ ] **ROI View**: Simple dashboard page showing these counters vs. compute cost.

---

## Implementation Map (Diff-Style)

### `maestro/`
- `src/tools/intelgraph.ts`: **NEW**. Bridge to IntelGraph search.
- `src/agents/definitions/ask_summit.ts`: **NEW**. Agent config.
- `src/agents/definitions/triage.ts`: **NEW**. Operational agent.

### `intelgraph/`
- `src/search/hybrid.ts`: **MODIFY**. optimize for agent query patterns (keyphrase extraction).

### `docs/`
- `ROI_TRACKER.md`: **NEW**. Weekly log of quantitative wins.

### `server/`
- `src/conductor/`: **MODIFY**. Add specific routes for "Ask Summit" chat API.

---

## Metrics for Success
| Metric | Baseline | Target (Day 60) |
| :--- | :--- | :--- |
| **Search Time** | 5 mins/query | < 30 sec |
| **Triage Coverage** | 0% (Manual) | 80% Auto-Labeled |
| **Provenance** | None | 100% of Agent Actions Logged |
