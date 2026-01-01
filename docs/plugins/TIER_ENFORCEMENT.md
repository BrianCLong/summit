# Tier Enforcement & Promotion

## Overview

Strict enforcement of autonomy tiers ensures that plugins cannot exceed their authorized level of control. This document details the mechanisms for enforcement, promotion, and demotion.

## Tier Capabilities

| Tier | Allowed Actions | Restrictions |
|---|---|---|
| **Tier 0** | `log`, `read_metric`, `emit_signal` | No write operations. No side effects. |
| **Tier 1** | `propose_action` | Actions must be approved via `GovernanceService`. |
| **Tier 2** | `execute_action` | Subject to `hardCaps` and `CoordinationService` arbitration. |
| **Tier 3** | `manage_policy`, `configure_system` | Restricted. |

## Enforcement Mechanism

Enforcement is implemented in the `PluginManager.executeAction` pipeline:

1. **Static Check**: Verify the plugin's assigned `autonomyTier` >= action's required tier.
2. **Dynamic Check**:
    *   **Tier 0**: Block all actions except `emit_signal` or passive reads.
    *   **Tier 1**: Wrap action in a `Proposal`. Trigger approval workflow.
    *   **Tier 2**: Check budget (`hardCaps`) and coordination status.

## Promotion & Demotion

### Promotion
*   **Manual**: Admin invokes `promotePlugin(pluginId, tier)`.
*   **Requirements**:
    *   Passed verification suite.
    *   Operational history at current tier (e.g., 7 days stable).
    *   Risk assessment signed off.

### Demotion
*   **Automatic**: Triggered by `CircuitBreaker` or `BudgetTracker`.
    *   Budget overrun -> Demote to Tier 0.
    *   Error rate spike -> Demote to Tier 0.
    *   Policy violation -> Revoke (Disable).
*   **Manual**: Admin override.

## Audit

All promotion/demotion events are recorded in the `ProvenanceLedger` with:
*   `oldTier`
*   `newTier`
*   `reason`
*   `authorizedBy`
