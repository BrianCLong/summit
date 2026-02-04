# Governed Agents Architecture

## 1. Overview

Summit's Governed Agents architecture ensures:
*   **Controllability**: Actions are bounded and policy-checked (DAE).
*   **Traceability**: Every interaction is logged in a tamper-evident ledger (AEG).
*   **Safety**: Risk tiers determine required controls (RTGO).

## 2. Components

*   **Deterministic Action Envelope (DAE)**:
    *   Wraps tool execution.
    *   Enforces `ExecutionBounds` (max calls, time).
    *   Enforces `PolicyRuntime` decisions (Allow/Deny/Approval).
*   **Audit Event Graph (AEG)**:
    *   `HashChainLedger`: Immutable log of events.
    *   `GovernanceMiddleware`: Auto-instrumentation of tools.
*   **Risk-Tier Governance Orchestrator (RTGO)**:
    *   `RiskClassifier`: Maps agent metadata to Risk Tiers (Low/Medium/High).
    *   `tiers.yaml`: Defines controls per tier.

## 3. Data Flow

1.  **Agent Execution Start**: Middleware initializes Trace Context.
2.  **Tool Call**:
    *   Middleware emits `ToolProposed`.
    *   DAE checks Bounds & Policy (RTGO).
    *   If Policy = `needs_approval`, DAE blocks/raises.
    *   If Policy = `deny`, DAE blocks/raises.
    *   If Allowed, Tool executes.
    *   Middleware emits `ToolExecuted` or `ToolFailed`.
3.  **Completion**:
    *   Evidence generated (`generate_report`).

## 4. Replay

*   `ExecutionManifest` captures inputs and the `trace` of tool executions.
*   `ReplayEngine` uses the trace to mock tool outputs, ensuring 100% reproduction of the agent's path provided inputs match.
