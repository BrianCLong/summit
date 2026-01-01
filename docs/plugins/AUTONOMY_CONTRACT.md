# Autonomy-Aware Plugin Contract

## Overview

This contract defines how plugins participate in the tiered autonomy system. Every plugin must declare its intent, requested autonomy tier, and adhere to strict resource and safety constraints.

## Autonomy Tiers

Plugins operate at one of four autonomy tiers:

| Tier | Name | Description | Requires Approval |
|---|---|---|---|
| **0** | **Advisory** | Passive. Can only emit logs, metrics, and recommendations. No side effects. | Default |
| **1** | **Semi-Autonomous** | Can propose actions that require human or system approval before execution. | Yes |
| **2** | **Autonomous** | Can execute declared actions within budget and policy limits without per-action approval. | Yes (High) |
| **3** | **Strategic** | Can orchestrate other agents and modify strategic parameters. Restricted to core platform plugins. | Yes (Board) |

## Plugin Manifest Extensions

The `PluginManifest` is extended to include the following fields:

```typescript
interface PluginManifest {
  // ... existing fields ...

  /**
   * The requested autonomy tier.
   * Defaults to 0 (Advisory) if omitted.
   */
  autonomyTier?: AutonomyTier;

  /**
   * List of high-level intents the plugin registers with the coordination layer.
   * Examples: ["optimize_network", "detect_threats", "manage_costs"]
   */
  intents?: string[];

  /**
   * List of metric names that this plugin guarantees not to degrade.
   * The coordination layer monitors these.
   */
  protectedMetrics?: string[];

  /**
   * Hard limits on resource consumption.
   */
  hardCaps?: {
    budget?: number; // Financial budget ($)
    cpu?: number;    // CPU share
    memory?: number; // Memory (MB)
    apiCalls?: number; // Rate limit
  };
}
```

## Validation Rules

1. **Manifest Validation**: All plugins are validated against this schema at installation.
2. **Tier Capping**: A plugin requesting Tier > 0 is installed at Tier 0 until explicitly promoted by an admin.
3. **Intent Registration**: Intents must be registered with the Coordination Service to avoid conflicts.
