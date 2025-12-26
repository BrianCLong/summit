# Threat Model: Autonomous Agent Expansion (Sprint N+14)

## 1. Introduction

This document outlines the threat model for the expanded autonomous agent capabilities introduced in Sprint N+14, specifically focusing on **Multi-Step Planning**. It identifies potential risks, abuse cases, and the mitigations implemented to address them.

## 2. Capability: Multi-Step Planning

The **Multi-Step Planning** capability allows agents to decompose high-level goals into a sequence of actionable tasks. This involves recursive reasoning and potential self-directed expansion of scope.

### 2.1 Asset Identification

*   **Compute Resources**: CPU, Memory, Tokens used during planning.
*   **System State**: The integrity of the application state (database, configurations).
*   **User Data**: Confidentiality of data accessed during planning/analysis.
*   **Reputation**: Trust in the system's autonomy.

## 3. Threat Analysis

### 3.1 Resource Exhaustion (Denial of Service)

*   **Threat**: An agent enters an infinite planning loop, consuming excessive CPU, memory, or tokens.
*   **Attack Vector**: Malicious or malformed goal input causing the planner to never converge.
*   **Mitigation**:
    *   **Hard Cap (Max Steps)**: `maxSteps` limit enforced by `EnhancedAutonomousOrchestrator` and `PlanningCapability`.
    *   **Hard Cap (Max Depth)**: `maxDepth` limit enforced by `PolicyEngine` and `PlanningCapability`.
    *   **Timeouts**: Execution timeouts for planning tasks.
    *   **Token Budgets**: Strict token budgets defined in `RunConfig`.

### 3.2 Logical Drift & Hallucination

*   **Threat**: The agent creates a plan that deviates significantly from the user's intent or safety guidelines (e.g., "Delete all files" to "Solve disk space issue").
*   **Attack Vector**: LLM hallucination or adversarial prompting.
*   **Mitigation**:
    *   **Policy Enforcement**: `PolicyEngine` evaluates every action against strict rules (OPA/Rego).
    *   **Human-in-the-Loop (HITL)**: Escalation thresholds triggered for high-risk actions or high step counts (> 50 steps).
    *   **Action Whitelisting**: `PlanningCapability` schema defines `prohibitedActions` (e.g., `exec_shell`).

### 3.3 Unauthorized Scope Expansion

*   **Threat**: The agent attempts to access resources or capabilities outside its authorized scope.
*   **Attack Vector**: Privilege escalation via planning logic.
*   **Mitigation**:
    *   **Capability Scoping**: Capabilities have explicit scopes (e.g., `plan:*`, `read:logs`).
    *   **Tenant Isolation**: All runs and tasks are scoped to `tenantId`.
    *   **Policy Checks**: `PolicyEngine` verifies user permissions for every planned task.

### 3.4 Uninterruptible Execution

*   **Threat**: A runaway agent continues executing actions despite an operator's attempt to stop it.
*   **Attack Vector**: Lack of check-points in the execution loop.
*   **Mitigation**:
    *   **Kill-Switch**: `EnhancedAutonomousOrchestrator` checks the Redis-backed kill switch before every task and inside the `executeTasksInOrder` loop.
    *   **Capability Integration**: `PlanningCapability` checks the kill switch internally between steps.

## 4. Mitigation Verification

| Threat | Mitigation | Status | Verification Method |
| :--- | :--- | :--- | :--- |
| Infinite Loop | `maxSteps` Limit | Implemented | Unit Test: `planning_capability.test.ts` |
| Deep Recursion | `maxDepth` Limit | Implemented | Unit Test: `planning_capability.test.ts` |
| Runaway Agent | Kill Switch | Implemented | Unit Test: `orchestrator.test.ts` |
| Scope Creep | Policy Engine | Implemented | Policy Test: `policy-engine.test.ts` |
| High Risk Actions | HITL Escalation | Implemented | Integration Test |

## 5. Conclusion

The introduction of Multi-Step Planning is guarded by a "Defense in Depth" strategy. No capability is unrestricted. The combination of hard caps, policy engines, and immutable audit logs ensures that agent expansion remains safe and controlled.
