# Policy-First Agent Execution

This document details the architecture and flow for the "Policy-First" execution model, ensuring every agent action is scrutinized before, during, and after execution.

## 1. Architecture

The execution flow is intercepted at three points:

1.  **Pre-Execution (Gatekeeper):** OPA policy check before the task is queued.
2.  **Mid-Execution (Monitor):** Real-time limit enforcement within the execution loop.
3.  **Post-Execution (Auditor):** Generation of a cryptographically signed receipt.

## 2. Policy Decision Point (PDP)

All agent actions are routed through a central `PolicyService`.

**Input Context:**
```json
{
  "tenantId": "...",
  "agentId": "...",
  "capability": "research.public",
  "action": "http.get",
  "resource": "https://api.example.com",
  "currentUsage": {
    "steps": 12,
    "tokens": 4500
  }
}
```

**Output Decision:**
```json
{
  "allow": true,
  "reason": "Whitelisted domain",
  "constraints": {
    "timeout": 5000
  }
}
```

## 3. Enforcement Logic

### Pre-Execution
*   **Validation:** Verify `agentId` has the required `capability` for the requested `action`.
*   **Budget Check:** Verify the tenant has sufficient budget.
*   **Compliance:** Check against global blocklists.

### Mid-Execution
*   **Resource Counting:** Every step increments the `usage` counters.
*   **Threshold Trigger:** If `usage > cap`, the `MaestroEngine` throws a `QuotaExceededError`.
*   **Loop Breaker:** Detect and break infinite loops.

### Post-Execution
*   **Receipt Generation:** A JSON structure containing inputs, decision ID, final usage stats, and outcome.
*   **Hashing:** The receipt is hashed and stored in the `ProvenanceLedger`.

## 4. OPA Policies

(Placeholder for Rego policies)
*   `allow_external_request`
*   `enforce_token_limits`
*   `prevent_cross_tenant_access`
