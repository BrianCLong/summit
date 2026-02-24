# Control Plane Boundaries

This document defines the strict, non-negotiable boundaries between the **Summit Switchboard (Control Plane)**, the **Agent Switchboard (Data Plane)**, and the **Maestro Conductor (Orchestration)**.

## Hard Boundaries

### 1. Control Plane (Summit Switchboard)
*   **Does**: AuthZ, Policy Check, Credential Issuance, Receipt Minting.
*   **Does NOT**: Execute tools, run LLM inference, hold long-running job state.
*   **Invariant**: "If it touches the outside world, it must have a Receipt."

### 2. Data Plane (Agent Switchboard)
*   **Does**: Execute tools, process data, call LLMs.
*   **Does NOT**: Make policy decisions, mint its own credentials, bypass the Control Plane.
*   **Invariant**: "No Credential, No Execution."

### 3. Orchestrator (Maestro Conductor)
*   **Does**: Schedule jobs, manage workflow state, retry logic.
*   **Does NOT**: Enforce granular tool-level policy (delegates to Control Plane).
*   **Invariant**: "Workflow state is distinct from Policy state."

## The 10 "Never" Rules

1.  **NEVER** issue a credential without a corresponding Policy Decision and Receipt.
2.  **NEVER** allow the Data Plane to mint its own tokens.
3.  **NEVER** expose the global Policy Graph to an individual Agent.
4.  **NEVER** route a request across Tenant boundaries.
5.  **NEVER** execute a tool if the Control Plane is unreachable (Fail Closed).
6.  **NEVER** store raw secrets in a Receipt.
7.  **NEVER** allow an Agent to modify its own permissions at runtime.
8.  **NEVER** bypass the "Deny-by-Default" gate for "testing convenience".
9.  **NEVER** persist long-lived credentials on the Data Plane filesystem.
10. **NEVER** trust input from the Data Plane without validation.

## Interface Contracts

### Control Plane <-> Data Plane
*   **Request**: `POST /v1/route { intent, context_hash }`
*   **Response**: `{ decision, token, receipt }` (or Error)
*   **Constraint**: The Token is cryptographically bound to the `context_hash` and cannot be reused for a different intent.

### Control Plane <-> Maestro
*   **Request**: `GET /v1/policy/check { workflow_id, step_id }`
*   **Response**: `{ allowed: boolean, constraints: [...] }`
*   **Constraint**: Maestro asks "Can I run this step?", Control Plane says "Yes, with these limits."
