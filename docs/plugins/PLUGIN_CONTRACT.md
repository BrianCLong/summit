# Plugin Interface Contract

## Overview

This document defines the contract for Summit plugins. All plugins must adhere to this interface to be installable, executable, and governable by the platform.

## Plugin Manifest (`plugin.json`)

Every plugin must be accompanied by a `plugin.json` manifest file.

```json
{
  "id": "com.example.my-plugin",
  "version": "1.0.0",
  "name": "My Example Plugin",
  "description": "A comprehensive example of a Summit plugin.",
  "author": "Example Corp",
  "license": "MIT",
  "category": "analytics",
  "entryPoint": "index.js",
  "minPlatformVersion": "2.0.0",
  "capabilities": [
    "read:entities",
    "access:external"
  ],
  "resources": {
    "memory": 128,
    "timeout": 30000,
    "network": {
      "domains": ["api.example.com"]
    }
  },
  "configSchema": {
    "type": "object",
    "properties": {
      "apiKey": { "type": "string", "secret": true }
    },
    "required": ["apiKey"]
  }
}
```

### Fields

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier (reverse domain notation recommended). |
| `version` | `string` | Semantic version (X.Y.Z). |
| `capabilities` | `string[]` | List of permissions requested by the plugin. |
| `resources` | `object` | Resource limits required by the plugin. |
| `configSchema` | `object` | JSON Schema for user configuration. |

## Plugin Interface

Plugins must export a class or object implementing the `Plugin` interface.

```typescript
export interface Plugin {
  /**
   * Initialize the plugin with context.
   * Called once when the plugin is loaded.
   */
  initialize(context: PluginContext): Promise<void>;

  /**
   * Execute a specific action.
   */
  execute(
    action: string,
    params: Record<string, unknown>,
    context: PluginContext
  ): Promise<PluginExecutionResult>;

  /**
   * Handle platform events.
   */
  onEvent?(
    event: PluginEvent,
    payload: Record<string, unknown>,
    context: PluginContext
  ): Promise<void>;

  /**
   * Clean up resources.
   */
  cleanup?(context: PluginContext): Promise<void>;
}
```

## Plugin Context

The platform provides a restricted `PluginContext` to the plugin.

```typescript
export interface PluginContext {
  tenantId: string;
  config: Record<string, unknown>;

  // Safe Utilities
  log: Logger;

  // Capability-Gated APIs
  fetch?: (url: string, init?: RequestInit) => Promise<Response>; // Requires 'access:external'
  store?: KeyValueStore; // Requires 'manage:config' or internal storage
}
```

## Capabilities

| Capability | Description |
|---|---|
| `read:entities` | Read access to the knowledge graph. |
| `write:entities` | Write access to the knowledge graph. |
| `access:external` | Ability to make outbound network calls (restricted by policy). |
| `execute:actions` | Ability to trigger other system actions. |

## Resource Limits

Plugins are strictly capped.

*   **Memory**: Default 128MB.
*   **Time**: Default 30s execution timeout.
*   **Network**: Allowlist-only domains.
