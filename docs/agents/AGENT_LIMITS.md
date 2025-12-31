# Agent Limits & Hard Caps

This document defines the hard limits enforced on all autonomous agents to prevent "runaway" behaviors, cost overruns, and resource exhaustion.

## 1. Global Hard Caps

These caps apply to **all** agents unless a specific exemption is granted via a signed policy override.

| Metric | Hard Cap (Default) | Critical Cap (Abs. Max) | Enforcement |
| :--- | :--- | :--- | :--- |
| **Max Actions per Run** | 50 steps | 200 steps | Terminate Run |
| **Max Wall-Clock Time** | 10 minutes | 60 minutes | Terminate Run |
| **Max Token Usage** | 100,000 tokens | 500,000 tokens | Stop Generation |
| **Max External Calls** | 20 calls | 100 calls | Block Request |
| **Max Spend** | $2.00 | $10.00 | Terminate Run |

## 2. Fail-Closed Default

If an agent attempts an action and the limit cannot be verified (e.g., metrics service down), the action is **DENIED**.

## 3. Tiered Limits

Agents are assigned a Tier based on their `templateId` and provenance.

### Tier 1: Sandbox (Default)
*   **Actions:** 10
*   **Time:** 2 mins
*   **Tokens:** 10k
*   **External Calls:** 0

### Tier 2: Standard
*   **Actions:** 50
*   **Time:** 10 mins
*   **Tokens:** 100k
*   **External Calls:** 20

### Tier 3: Power User (Requires Approval)
*   **Actions:** 200
*   **Time:** 60 mins
*   **Tokens:** 500k
*   **External Calls:** 100

## 4. Rate Limiting

*   **Per Agent:** 1 run concurrent.
*   **Per Tenant:** 5 runs concurrent (Tier 1), 20 (Tier 2).
*   **Loop Detection:** Execution halts if the same action sequence repeats 3 times.

## 5. Override Process

Overrides are only possible via a `PolicyOverride` token signed by a designated approver, which must be included in the run `metadata`.
