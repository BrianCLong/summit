# Plugin Interface Contract

## Overview
The Plugin Interface Contract defines the structure, capabilities, and behavioral guarantees required for all Summit extensions.

## The `Plugin` Interface
Every plugin must export a default object (or class instance) adhering to this interface:

```typescript
export interface Plugin {
  manifest: PluginManifest;
  initialize(context: PluginContext): Promise<void>;
  execute(action: string, params: any, context: PluginContext): Promise<PluginExecutionResult>;
  cleanup?(context: PluginContext): Promise<void>;
}
```

## Plugin Manifest
Metadata defining identity and requirements.

```json
{
  "id": "com.example.my-plugin",
  "version": "1.0.0",
  "name": "Example Plugin",
  "capabilities": ["network.outbound", "fs.read"],
  "trustTier": "PARTNER"
}
```

## Capabilities
Permissions are explicitly declared:
- `network.outbound`: Make external HTTP requests.
- `fs.read`: Read from allowed paths.
- `vault.read`: Access secrets.
- `cache.write`: Store data in cache.

## Execution Context
Plugins receive a safe context object:
- `fetch`: Proxied HTTP client.
- `fs`: Sandbox filesystem access.
- `log`: Structured logger.
- `principal`: Identity of the caller.
