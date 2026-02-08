# Summit Orchestration, Context, and Agentic RAG

## 1) Predictive Orchestration Architecture

### What it does

- Classifies each task into:
  - `SINGLE_AGENT`
  - `CENTRALIZED`
  - `HYBRID`
- Uses task signals:
  - decomposability
  - estimated tool count
  - sequential dependency
  - risk score
  - time criticality
- Tracks step-level error amplification and recommends fallback architectures.

### How to use

- Before execution, call
  `ArchitectureSelector.predictOptimalArchitecture(features)`.
- Build `TaskSignalFeatures` from task metadata.
- After execution, call
  `monitorErrorAmplification(architecture, stepResults)`.

### Tuning

- Calibrate thresholds with production telemetry.
- Analyze architecture selection and error outcomes by task class.

## 2) Hybrid Context Management

### What it does

- Reduces context size with:
  - observation/action masking outside a recent window
  - periodic summarization of older turns
- Returns both transformed context and token/cost metrics.

### How to use

- Construct `HybridContextManager` with:
  - `LLMClient`
  - `HybridContextOptions`
- Call `manageContext(context)` before LLM invocation.
- Log returned metrics for optimization and A/B testing.

### Suggested defaults

- High-iteration agents:
  - `observationWindow`: `10-20`
  - `summarizationInterval`: `50-100`
- Short workflows:
  - high summarize interval and mostly masking.

## 3) Agentic RAG + IntelGraph

### What it does

- Combines:
  - vector recall
  - graph expansion
  - planner/researcher reasoning
- Enforces intent compilation and evidence-budget limits.
- Supports:
  - single retrieval (`retrieve`)
  - iterative reasoning (`multiStepReasoning`)

### How to use

- Build:
  - `MemorizerAgent` with `VectorDatabase`, `GraphDatabase`, `EmbeddingClient`
  - `ResearcherAgent` with `EmbeddingClient`, `LLMReasoner`
  - `GraphExpander` with `GraphDatabase`
  - `AgenticRAG` with optional `IntentCompiler` and `EvidenceBudget`
- Invoke:
  - `retrieve({ text, entities })`
  - `multiStepReasoning({ text, entities })`

### Integration points

- API: add retrieval mode `agentic_rag`.
- UI: display:
  - answer
  - supporting passages
  - expanded graph context
  - reasoning trace

## 4) Rollout and Observability

- Roll out behind flags by tenant/environment.
- Assistant runtime flags:
  - `ASSISTANT_RETRIEVAL_MODE=classic|agentic_rag`
  - `AGENTIC_RAG_MAX_HOPS` (default `2`)
  - `AGENTIC_RAG_MAX_EDGES` (default `40`)
  - `AGENTIC_RAG_MAX_PASSAGES` (default `12`)
- Log:
  - selected architecture + error metrics
  - context token/cost deltas
  - Agentic RAG confidence/latency/usage
- Compare to baseline via A/B experiments for success, latency, and cost.
