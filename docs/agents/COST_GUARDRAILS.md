# Cost & Abuse Guardrails

This document outlines the mechanisms for financial governance and abuse prevention for autonomous agents.

## 1. Cost Accounting

### Per-Run Estimation
Before execution, a `CostEstimator` calculates the maximum potential cost based on the `Tier` and `Caps`.
*   `EstCost = (MaxTokens * CostPerToken) + (MaxTime * ComputeCost)`
*   This amount is "reserved" from the budget.

### Actual Billing
After execution, the `ActualCost` is calculated and the reservation is settled.
*   `ActualCost = (UsedTokens * CostPerToken) + (UsedTime * ComputeCost)`

## 2. Abuse Signals

The `AbuseDetector` monitors real-time metrics for anomalies:

| Signal | Threshold | Action |
| :--- | :--- | :--- |
| **Rapid Retries** | > 10 failures / min | **Temp Ban (10m)** |
| **Policy Denial Spike** | > 50% denial rate | **Suspend Agent** |
| **Cap Hit Frequency** | > 80% runs hit cap | **Downgrade Tier** |
| **Cost Velocity** | > $10 / hour | **Trigger Alert** |

## 3. Automated Kill-Switch

A global and granular kill-switch system is available to stop runaway agents instantly.

**Levels:**
1.  **Agent Level:** `kill_switch:agent:<agent_id>`
2.  **Tenant Level:** `kill_switch:tenant:<tenant_id>`
3.  **Template Level:** `kill_switch:template:<template_id>`
4.  **Global:** `kill_switch:global` (Panic Button)

**Mechanism:**
*   The `MaestroEngine` checks Redis keys before *every* step.
*   If a key exists, the run is immediately terminated with `status: killed`.

## 4. Configuration

Configured via `server/src/maestro/governance/config.ts`.
