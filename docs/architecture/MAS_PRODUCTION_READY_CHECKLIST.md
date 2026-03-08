# Multi-Agent System (MAS) Production Readiness Checklist

Based on engineering principles for resilient multi-agent workflows.

## 1. Explicit Orchestration
- [ ] **Deterministic Execution Graph**: Is the workflow defined as a Directed Acyclic Graph (DAG) or a state machine?
- [ ] **Enforced Transitions**: Are state transitions explicitly controlled by the orchestrator rather than left to "emergent collaboration"?
- [ ] **No Free-Running Agents**: Do agents wait for a signal/task from the orchestrator before executing?

## 2. Single Source of Truth (State Management)
- [ ] **Canonical Memory**: Is there a shared, structured state store that all agents use?
- [ ] **No Prompt-Based Reconstruction**: Do agents receive the exact state they need via structured data instead of trying to "reconstruct" it from past chat history?
- [ ] **Atomic Updates**: Are state updates handled atomically to prevent race conditions or stale data?

## 3. Constrained Interfaces
- [ ] **Schema-Validated Contracts**: Do all agents emit structured outputs (e.g., JSON Schema, Pydantic models)?
- [ ] **Input Constraints**: Are agent inputs strictly defined and validated before the agent receives them?
- [ ] **No Free-Form Blobs**: Is the passing of unstructured "blobs" between agents minimized?

## 4. Built-in Evaluation & Guardrails
- [ ] **Validation Checkpoints**: Are there "Guardrail Layers" between agent steps to validate outputs before proceeding?
- [ ] **Trace Capture**: Is every step of the orchestration recorded with full context (inputs, outputs, model params, latency)?
- [ ] **Failure Handling**: Are there explicit strategies for handling agent failures (retries, fallbacks, manual intervention)?
- [ ] **Metrics Collection**: Are performance metrics (tokens, cost, p95 latency) collected per agent and per workflow?

## 5. Architectural Alignment
- **Layer 1**: Deterministic Orchestrator (Execution Fabric)
- **Layer 2**: Canonical State Store (Shared Memory)
- **Layer 3**: Stateless, Contract-Driven Workers (Agents)
- **Layer 4**: Continuous Validation Layer (Guardrails)
