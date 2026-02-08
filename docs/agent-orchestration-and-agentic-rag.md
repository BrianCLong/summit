# Summit Orchestration, Context, and Agentic RAG

## 1. Predictive Orchestration Architecture

### What it does

- Classifies each task into one of:
  - SINGLE_AGENT
  - CENTRALIZED
  - HYBRID
- Uses task features (decomposability, tool count, sequential dependency, risk, time-criticality) to choose orchestration architecture.
- Tracks error amplification across steps and suggests alternative architectures when error rates are high.

### How to use

- Orchestrator calls `ArchitectureSelector.predictOptimalArchitecture(features)` before executing a task.
- Pass `TaskSignalFeatures` derived from the task definition.
- After execution, call `monitorErrorAmplification(architecture, stepResults)` to compute metrics and potentially adjust future defaults.

### Tuning

- Update thresholds in `ArchitectureSelector` based on real-world telemetry.
- Log `ErrorMetrics` to observability for per-task-type analysis.

---

## 2. Hybrid Context Management

### What it does

- Reduces context length while preserving decision-critical information.
- Uses two mechanisms:
  - Observation masking for older turns
  - Periodic summarization into a `summary` field

### How to use

- Construct `HybridContextManager` with:
  - `LLMClient` implementation
  - `HybridContextOptions` per agent type
- Call `manageContext(context)` before invoking LLMs.
- Use returned `context` as the LLM input and log `metrics`.

### Recommended defaults

- High-iteration tools/agents:
  - `observationWindow`: 10–20 turns
  - `summarizationInterval`: 50–100 turns
- Short-lived workflows:
  - Keep `summarizationInterval` high, rely mostly on masking.

---

## 3. Agentic RAG + IntelGraph

### What it does

- Combines:
  - Vector search
  - Graph traversal/expansion
  - Dual-agent memory (Memorizer + Researcher)
- Supports both:
  - Single-shot hybrid retrieval (`retrieve`)
  - Multi-step reasoning with explicit reasoning trace (`multiStepReasoning`)

### How to use

- Instantiate `MemorizerAgent`, `ResearcherAgent`, `GraphExpander` with:
  - `VectorDatabase`
  - `GraphDatabase`
  - `EmbeddingClient`
  - `LLMReasoner`
- Build an `AgenticRAG` instance and call:
  - `retrieve({ text, entities })` in IntelGraph query flows
  - `multiStepReasoning({ text, entities })` for deep analytic questions

### Integration points

- IntelGraph APIs:
  - Wrap Agentic RAG as a new retrieval mode (“agentic_rag”).
- UI:
  - Display:
    - Answers
    - Supporting passages
    - Highlighted graph subgraph
    - Reasoning trace (steps) for analysts

---

## 4. Rollout and Observability

- Enable behind feature flags per tenant or environment.
- Log:
  - Chosen orchestration architecture and `ErrorMetrics`
  - Context management metrics (tokens and cost deltas)
  - Agentic RAG usage: query type, latency, confidence
- Readiness reference: `docs/SUMMIT_READINESS_ASSERTION.md`.

- Run A/B tests against current baseline for:
  - Task success rate
  - Latency
  - Token/cost usage
