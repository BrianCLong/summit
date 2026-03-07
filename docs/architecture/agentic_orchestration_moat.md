# Strategic Moat: Agentic Orchestration

**Status:** DRAFT
**Owner:** Architecture / Competitive Intelligence
**Last Updated:** 2026-01-24

## Executive Summary

External analysis of the agentic ecosystem (AWS, Google Gemini, Academic research) reveals a convergence on **multi-agent orchestration**, **hierarchical planning**, and **governance**. While the market is maturing, most implementations remain "prototype-grade" — relying on chatty interfaces, unbounded context, and opaque decision-making.

Summit's strategic moat lies in **formalizing** these patterns into **hardened, governed primitives**. We do not just "run agents"; we **orchestrate evidence**.

## 1. Orchestration Layers & Patterns

### External Pattern: Hierarchical Planning

- **Market State:** Use of a "Planner" agent to decompose tasks and "Worker" agents to execute them.
- **Summit Moat:** **Deterministic Hierarchical Graphs**. Instead of a probabilistic "plan", we compile intents into a `HierarchicalPlanGraph` (DAG) where edges are enforced by policy.
  - _Primitive:_ `HierarchicalPlanGraph`
  - _Advantage:_ predictable execution, loop detection, and auditability.

### External Pattern: Multi-Agent Communication

- **Market State:** Agents communicate via natural language chat logs. High latency, non-deterministic, hard to parse.
- **Summit Moat:** **Evidence-Based Exchange**. Agents exchange structured `EvidenceArtifacts`. Communication is only valid if it references a verified `EvidenceID`.
  - _Primitive:_ `AgentCommunicationProtocol` (Schema-first, not text-first).
  - _Advantage:_ "No-Hallucination" guarantee for inter-agent data transfer.

## 2. Memory & Context Management

### External Pattern: Shared Memory / RAG

- **Market State:** Dumping all context into a vector store or large context window.
- **Threat:** Context pollution, "lost in the middle" phenomenon, leaking PII between tenants.
- **Summit Moat:** **Scoped Memory Manifests**. Every execution defines a `MemoryScopeManifest` that explicitly allows/denies access to specific data slices.
  - _Primitive:_ `MemoryScopeManifest.yaml`
  - _Advantage:_ Least-privilege data access for agents.

## 3. Governance & Evaluation

### External Pattern: "Human-in-the-Loop" (HITL)

- **Market State:** A user approves a final output or interrupts a stream.
- **Summit Moat:** **Pre-Flight Policy Interception**. Governance is not an afterthought; it is a middleware that intercepts every `ToolCall` and `PlanNode` _before_ execution.
  - _Primitive:_ `OrchestrationDecisionLog` (recording the _why_ of the interception).
  - _Advantage:_ Proactive prevention of policy violations (Data Sovereignty, Cost caps).

## 4. Cost & Performance Observability

### External Pattern: Token Counting

- **Market State:** Aggregate token usage per session.
- **Summit Moat:** **Attributed Unit Economics**. We track cost per _outcome_, not just per session. Every node in the `HierarchicalPlanGraph` has an associated cost and latency budget.
  - _Primitive:_ `AgentExecutionRecord` (with micro-costing).
  - _Advantage:_ Ability to optimize "Cost of Intelligence" (CoI) at a granular level.

## 5. Implementation Strategy

To secure this moat, we must implement the following primitives immediately:

1.  **`AgentExecutionRecord`**: The immutable log of what happened.
2.  **`OrchestrationDecisionLog`**: The immutable log of _why_ it happened (routing decisions).
3.  **`MemoryScopeManifest`**: The contract for what data was accessible.
4.  **`HierarchicalPlanGraph`**: The deterministic map of the agentic workflow.

These artifacts will feed into the `AgentExecutionProof` (AEP) for compliance auditing.
