# PsyOps Orchestration Audit

**Subject**: `intelgraph_psyops_orchestrator.py` & `python/counter_psyops_engine.py`
**Date**: 2025-10-15
**Auditor**: Jules

## Audit Against MAS Production Readiness Checklist

### 1. Explicit Orchestration
- **Status**: Partially Compliant.
- **Findings**: The workflow is hard-coded as a linear sequence of four phases in `intelgraph_psyops_orchestrator.py`. While easy to follow, it lacks the flexibility and error-handling of a formal DAG. Transitions are implicit in the code flow.

### 2. Single Source of Truth (State Management)
- **Status**: Non-Compliant.
- **Findings**: The orchestrator uses `postgres_client.log_processing_event` for persistence, but this is an audit trail, not a state store. The actual state (the narrative and its analysis) is passed as mutable dictionaries between phases. This increases the risk of state corruption and makes it hard to "resume" a failed workflow.

### 3. Constrained Interfaces
- **Status**: Non-Compliant.
- **Findings**: Communication between phases uses Python `dict`. There is no schema validation (e.g., Pydantic) to ensure that `Phase 1` produced the required fields for `Phase 2`. This leads to "at-runtime" failures (e.g., `KeyError`) that are hard to debug.

### 4. Built-in Evaluation & Guardrails
- **Status**: Partially Compliant.
- **Findings**: Prometheus metrics provide high-level monitoring. However, there are no "Guardrail Layers" that validate the *quality* or *safety* of an agent's output before it passes to the next phase. For example, the Obfuscation layer could produce gibberish, but the system would still mark it "complete."

## Recommendations
1.  **Introduce Pydantic Models**: Define `NarrativeState`, `AnalysisResult`, and `CounterMessage` models.
2.  **State Store Wrapper**: Create a `WorkflowStateStore` that handles atomic updates to the narrative state in Postgres/Redis.
3.  **Phase Validation**: Implement a decorator or wrapper that validates the output of each phase against its contract.
4.  **Guardrail Integration**: Add a specific `GuardrailPhase` between Analysis and Counter-Messaging to ensure the counter-narrative is safe and aligned with policy.
