# Coordination Integration for Plugins

## Overview

To ensure safe operation in a multi-agent ecosystem, plugins must integrate with the central **Coordination Service**. This ensures that autonomous actions do not conflict with core system loops or other plugins.

## Intent Registration

When a plugin is enabled, its `intents` (declared in the manifest) are registered with the Maestro Coordination Service.

1. **Plugin Enablement**: `PluginManager` calls `CoordinationService.registerAgent(pluginId, intents)`.
2. **Conflict Check**: The Coordination Service checks for conflicting intents (e.g., two plugins trying to "optimize_network" simultaneously).
3. **Arbitration**: If conflicts exist, the coordination policy determines which plugin takes precedence (usually based on Tier or specific arbitration rules).

## Operational Flow

### 1. Action Request
When a plugin attempts to execute an action (via `executeAction`), the `PluginManager` checks:
*   **Tier Permission**: Is the plugin allowed to perform this action at its current tier?
*   **Coordination Lock**: Does the action require a lock on a shared resource?

### 2. Coordination Loop
For Tier 2+ plugins, the `PluginManager` may delegate the decision to the Coordination Service:
*   `CoordinationService.requestPermission(pluginId, action, context)`
*   The service evaluates current system state, active intents, and other agents.
*   Returns `ALLOW`, `DENY`, or `DEFER`.

## Conflict Handling

*   **Allow**: Action proceeds.
*   **Deny**: Action is blocked. Reason is logged.
*   **Defer**: Action is queued until a conflict is resolved or a higher-priority task completes.

## Receipts

All coordination decisions produce a **Coordination Receipt**, stored in the `ProvenanceLedger`, linking the plugin action to the arbitration decision.
