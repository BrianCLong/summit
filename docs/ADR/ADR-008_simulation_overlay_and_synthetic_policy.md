# ADR-008: Simulation Overlay and Synthetic Data Policy

- **Status:** Proposed
- **Date:** 2025-12-05
- **Owner:** Simulation / AI Team

## 1. Context

Summit aims to support:

- Narrative simulation (“what-if” scenarios, crisis evolution).
- AI copilots deriving insights and predictions from the graph.

If not carefully constrained, these capabilities can:

- Pollute the **canonical fact graph** with speculative or hallucinated edges.
- Create **feedback loops** (the system ingests its own predictions as facts).
- Undermine analyst trust if predictions cannot be clearly traced to evidence.

We need a **clear separation** between:

- What we **know** (facts + observations).
- What we **believe** might happen (simulated outcomes).
- What the **models** invented (synthetic data).

## 2. Decision

We will:

1. Model narrative simulations as **overlay graphs**:
   - Introduce `Hypothesis` nodes representing simulation runs.
   - Introduce `PredictedEvent` nodes representing simulated future events or states.
   - Use relationships:
     - `SIMULATES` (Hypothesis → PredictedEvent)
     - `INVOLVES` (PredictedEvent ↔ Entity)
     - `LEADS_TO` (PredictedEvent → PredictedEvent) for causal chains.

2. Tag all AI-generated artifacts as **synthetic**:
   - Nodes and edges created from model outputs will carry:
     - `source = 'synthetic'`
     - Additional metadata describing the model and parameters.

3. Prevent ingestion of synthetic artifacts into canonical ingest:
   - Ingest pipelines will explicitly filter out:
     - Any nodes/edges with `source = 'synthetic'`.
   - Synthetic data is only generated and used within:
     - Simulation overlay.
     - Limited, opt-in analysis paths.

4. Enforce an **evidence and explainability requirement**:
   - Each prediction (PredictedEvent) must carry:
     - References to supporting `Observation` IDs.
     - Provenance metadata (e.g., which `Source` and time window).
   - The API exposes endpoints to:
     - Retrieve the supporting subgraph for a given prediction (“Why?”).

## 3. Rationale

- **Trust & explainability**  
  Analysts and customers must be able to:
  - Distinguish fact from hypothesis.
  - Understand why a particular simulation output was produced.

- **Model safety**  
  Avoids model collapse where AI trains on or ingests its own outputs as if they were ground truth.

- **Clean mental model**  
  Separating canonical and overlay graphs makes it easier to reason about versioning, retention, and UI presentation.

## 4. Implications

### 4.1 On schema

- Neo4j will gain:
  - Node labels: `Hypothesis`, `PredictedEvent`.
  - Relationship types: `SIMULATES`, `INVOLVES`, `LEADS_TO`.
- Canonical graph queries:
  - Should **exclude** `Hypothesis` and `PredictedEvent` by default.
- Simulation queries:
  - May join canonical entities with overlay nodes when explicitly requested.

### 4.2 On ingestion

- Any ingestion path (batch, streaming, manual import) must:
  - Reject records where `source = 'synthetic'`, or
  - Route them explicitly to a separate overlay storage path.
- Simulation and copilot services:
  - Are responsible for setting `source = 'synthetic'` on generated nodes/edges.

### 4.3 On API and UI

- API:
  - Provide endpoints for:
    - Creating a Hypothesis with parameters and base snapshot reference.
    - Attaching PredictedEvents to Hypotheses.
    - Fetching predictions with their evidence subgraphs.
  - Enforce security and rate limiting for simulation endpoints.

- UI:
  - Present overlays as **ghost nodes** (e.g. dashed outlines, different colors).
  - Offer a toggle to:
    - Show/hide simulation overlays.
  - Provide a “Why?” interaction:
    - Clicking a prediction highlights supporting evidence paths.

### 4.4 On performance

- More nodes and relationships:
  - Overlays will increase graph size.
- Mitigation:
  - Overlays can be:
    - Archived or pruned based on age, usage, or relevance.
    - Stored in separate subgraphs keyed by Hypothesis ID.

## 5. Alternatives Considered

1. **Merging predictions into the canonical graph**
   - Simple for demos but blurs the line between fact and hypothesis.
   - Risks model collapse and user confusion.

2. **Storing simulations entirely outside the graph**
   - E.g. in a document store / JSON fields only.
   - Would make it harder to visualize and reason about predicted relationships in graph-native workflows.

3. **Using only text-based explanations from the LLM**
   - Harder to link back to specific graph elements and Observations.
   - Less actionable for pathfinding and multi-hop queries.

## 6. Rollout Plan

- Phase 1:
  - Implement schema for Hypotheses and PredictedEvents.
  - Add initial API endpoints and GraphQL types.
- Phase 2:
  - Update simulation engine to write overlay nodes/edges instead of modifying canonical graph.
  - Tag synthetic artifacts with `source = 'synthetic'`.
- Phase 3:
  - Implement and integrate “Why?” APIs and UI.
  - Add tests to ensure:
    - No synthetic data flows through ingest.
    - Overlay toggling behaves as expected.

## 7. Open Questions

- Where should we store simulation snapshots (full graph hashes vs replayable queries)?
- What retention policy should apply to simulations (e.g., auto-archive after N days)?
- Do we need multiple overlay layers (e.g., per-user, per-team, per-scenario)?
