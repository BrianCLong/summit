# Summit Runtime Contract

The **Summit Runtime** is the production infrastructure layer responsible for executing agent workflows with enterprise guarantees. This document defines the "non-negotiable" features and contracts that the Runtime must implement.

## 1. Durable Execution

The Runtime must ensure that workflows are resilient to failures and can be resumed from the last known good state.

*   **Resumability:** If the execution environment crashes or restarts, the agent workflow must resume automatically without data loss.
*   **Crash-Safe Checkpointing:** Every state transition (step completion, tool call, reasoning step) must be persisted to a durable store (Postgres/Neo4j) *before* external side effects are finalized where possible.
*   **Idempotency:** Replaying a step that has already completed must not trigger duplicate side effects (e.g., sending an email twice).
*   **Replayability:** The system must support replaying historical workflows for debugging or auditing purposes.

## 2. Streaming Everywhere

Real-time feedback is critical for user experience and system observability.

*   **Token Streaming:** LLM generation tokens must be streamed to the client immediately.
*   **Event Streaming:** High-level lifecycle events (e.g., `step_start`, `tool_call`, `step_complete`) must be emitted as they happen.
*   **State-Diff Streaming:** Only the *changes* in state (patches) should be sent over the wire to minimize bandwidth and latency.

## 3. Human-in-the-Loop (HITL)

The Runtime must treat human intervention as a first-class citizen.

*   **Interrupts:** The ability to pause execution at specific breakpoints (e.g., before a sensitive tool call) based on policy.
*   **Approvals:** Mechanisms for humans to approve, reject, or modify a proposed action.
*   **State Inspection & Modification:** Authorized users must be able to inspect the current state of a paused agent and modify it (e.g., correcting a hallucinated variable) before resuming.

## 4. Persistence & Isolation

State must be managed securely and consistently across long-running sessions.

*   **Thread-Level State:** Context is maintained per conversation thread.
*   **Cross-Thread State:** Shared memory or knowledge graphs accessible across multiple threads, governed by policy.
*   **Tenant Isolation:** Strict data isolation between tenants. One tenant's agent must never access another tenant's state.
*   **Provenance-Bound:** All state changes must be linked to the provenance event that caused them.

## 5. Governance & Audit

The defining feature of the Summit Runtime is its "Compliance by Default" architecture.

*   **Policy Enforcement:** All actions (tool calls, state transitions) must pass through the Policy Engine (OPA) before execution.
*   **Immutable Audit Logs:** A tamper-evident log of all actions, decisions, and outcomes.
*   **Provenance Generation:** Automatic generation of lineage data (W3C PROV) for every artifact and decision.
