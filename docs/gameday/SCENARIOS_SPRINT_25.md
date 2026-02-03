> **ARCHIVED: GA PROGRAM v1**
> This document is part of the GA Program v1 archive. It is read-only and no longer active.
> **Date:** 2026-01-25

# GameDay Scenarios: Sprint 25

This document outlines the live-fire scenarios designed to validate Summit's incident response capabilities.

**Execute these drills in the STAGING or SANDBOX environment only.**

## Scenario 1: The Recursive Agent Loop (Agent Runaway)
**Hypothesis:** The system detects an agent stuck in a loop and the `AgentRunaway` alert fires. The containment runbook allows an operator to kill the specific run.
*   **Trigger:** Submit an agent prompt: "Repeat the word 'test' forever and never stop." (ensure `MAX_ITERATIONS` is high or disabled for this test user).
*   **Expected Behavior:**
    *   `intelgraph_agent_loop_iterations` increases rapidly.
    *   Alert `AgentLoopHigh` fires.
    *   Operator follows `docs/runbooks/agent-runaway.md` to kill the run via API.
*   **Success Criteria:** Run stopped within 2 minutes. Budget impact < $5.

## Scenario 2: The Policy False Positive (Misconfiguration)
**Hypothesis:** A new restrictive policy blocks legitimate traffic. The response team can identify and disable the policy without a full rollback.
*   **Trigger:** Deploy a policy that denies all actions with `resource_type="report"`. Attempt to generate a report.
*   **Expected Behavior:**
    *   Request denied (403).
    *   Alert `SecurityPolicyViolations` spikes.
    *   Operator identifies `policy_id` in logs.
    *   Operator disables policy via `summitctl` or feature flag.
*   **Success Criteria:** Service restored within 10 minutes.

## Scenario 3: The Data Leak (Cross-Tenant Access)
**Hypothesis:** A simulated cross-tenant access attempt triggers a critical security alert.
*   **Trigger:** Use a test user from Tenant A to request a resource ID belonging to Tenant B (using a direct API call, bypassing UI).
*   **Expected Behavior:**
    *   Request denied (403).
    *   Metric `intelgraph_security_cross_tenant_access_denied_total` increments.
    *   Alert `CrossTenantAccessAttempts` fires (SEV1).
*   **Success Criteria:** Alert received by Security Ops within 1 minute.

## Scenario 4: The Global Kill-Switch (Panic Button)
**Hypothesis:** In a catastrophic failure, the global kill-switch stops all non-admin traffic immediately.
*   **Trigger:** Activate `SUMMIT_GLOBAL_KILL_SWITCH=true` in Staging.
*   **Expected Behavior:**
    *   Standard user API calls return 503 Service Unavailable.
    *   Admin API calls work.
    *   Alert `KillSwitchActive` fires.
*   **Success Criteria:** Traffic drops to zero immediately.

## Scenario 5: The Expensive Plugin (Budget Drain)
**Hypothesis:** A plugin consuming excessive budget is detected and disabled.
*   **Trigger:** Mock a plugin that costs $10/call. Have an agent call it 10 times in 1 minute.
*   **Expected Behavior:**
    *   Budget usage spike.
    *   Alert `HighCostOperations` fires.
    *   Operator disables the plugin via `summitctl`.
*   **Success Criteria:** Plugin disabled, agent fails gracefully (or halts).
