# @summit/plugin-host

Plugin Host Service for managing plugin runtime and execution in the Summit/IntelGraph platform.

## Overview

The Plugin Host Service provides a complete runtime environment for managing third-party plugins with:

- **Lifecycle Management** - Install, enable, disable, update, and hot-reload plugins
- **Security** - Code scanning, signature verification, permission checking, sandboxing
- **Resource Management** - CPU, memory, storage, and network quotas with enforcement
- **Authorization** - OPA/ABAC integration for fine-grained access control
- **Monitoring** - Health checks, resource usage tracking, violation detection
- **REST API** - Complete HTTP API for plugin management

## Installation

```bash
pnpm add @summit/plugin-host
```

## Quick Start

```typescript
import { PluginHostService, PluginHostAPI, createLogger } from '@summit/plugin-host';

// Configuration
const config = {
  platformVersion: '1.0.0',
  environment: 'production',
  security: {
    scanOnInstall: true,
    requireSignature: true,
  },
  authorization: {
    provider: 'opa',
    opaEndpoint: 'http://localhost:8181',
    policyPath: '/v1/data/plugins/allow',
  },
  monitoring: {
    healthCheckIntervalMs: 30000,
    autoDisableOnViolation: true,
  },
  autoStart: {
    enabled: true,
    plugins: ['analytics-core', 'visualization-graphs'],
  },
};

// Create service
const logger = createLogger('PluginHost');
const service = new PluginHostService(config, logger);
const api = new PluginHostAPI(service, logger);

// Start service
await service.start();
await api.start(3001);

console.log('Plugin Host Service running on http://localhost:3001');
```

## API Endpoints

### Service Health

```bash
GET /api/health
```

Returns overall service health status.

### List Plugins

```bash
GET /api/plugins?category=analytics&state=active
```

List all installed plugins with optional filters.

### Get Plugin Details

```bash
GET /api/plugins/:id
```

Get detailed information about a specific plugin.

### Install Plugin

```bash
POST /api/plugins
Content-Type: application/json

{
  "manifest": {
    "id": "my-analytics-plugin",
    "name": "My Analytics Plugin",
    "version": "1.0.0",
    "description": "Custom analytics for threat detection",
    "author": { "name": "Security Team" },
    "license": "MIT",
    "category": "analyzer",
    "main": "./dist/index.js",
    "engineVersion": "^1.0.0",
    "permissions": ["read:data", "access:graph"]
  },
  "source": {
    "type": "local",
    "path": "/path/to/plugin"
  },
  "userId": "user-123",
  "tenantId": "tenant-456"
}
```

### Enable Plugin

```bash
POST /api/plugins/:id/enable
Content-Type: application/json

{
  "userId": "user-123",
  "tenantId": "tenant-456"
}
```

### Disable Plugin

```bash
POST /api/plugins/:id/disable
```

### Reload Plugin

```bash
POST /api/plugins/:id/reload
```

Hot-reload a plugin without restart.

### Update Plugin

```bash
PUT /api/plugins/:id
Content-Type: application/json

{
  "version": "2.0.0"
}
```

### Uninstall Plugin

```bash
DELETE /api/plugins/:id
```

### Plugin Health

```bash
GET /api/plugins/:id/health
```

Get health status and resource usage for a plugin.

## Programmatic Usage

```typescript
// Install a plugin
await service.installPlugin(manifest, source, options);

// Enable a plugin
await service.enablePlugin('my-plugin-id');

// Disable a plugin
await service.disablePlugin('my-plugin-id');

// Update a plugin
await service.updatePlugin('my-plugin-id', '2.0.0');

// Hot reload
await service.reloadPlugin('my-plugin-id');

// List plugins
const plugins = await service.listPlugins({ category: 'analytics' });

// Get plugin health
const health = await service.getPluginHealth('my-plugin-id');

// Get service health
const serviceHealth = await service.getServiceHealth();
```

## Events

The Plugin Host Service emits events for monitoring:

```typescript
service.on('plugin:installed', ({ pluginId, version }) => {
  console.log(`Plugin ${pluginId}@${version} installed`);
});

service.on('plugin:enabled', ({ pluginId }) => {
  console.log(`Plugin ${pluginId} enabled`);
});

service.on('plugin:disabled', ({ pluginId }) => {
  console.log(`Plugin ${pluginId} disabled`);
});

service.on('plugin:unhealthy', ({ pluginId, health }) => {
  console.warn(`Plugin ${pluginId} unhealthy:`, health);
});

service.on('plugin:quota-violation', ({ pluginId, violations }) => {
  console.error(`Plugin ${pluginId} quota violations:`, violations);
});
```

## Configuration

### Security

```typescript
security: {
  scanOnInstall: boolean;      // Scan plugins during installation
  requireSignature: boolean;   // Require code signing
}
```

### Authorization

```typescript
authorization: {
  provider: 'opa' | 'development';
  opaEndpoint?: string;        // OPA server URL
  policyPath?: string;         // OPA policy path
}
```

### Monitoring

```typescript
monitoring: {
  healthCheckIntervalMs: number;     // Health check frequency
  autoDisableOnViolation: boolean;   // Auto-disable on critical violations
}
```

### Auto-Start

```typescript
autoStart: {
  enabled: boolean;            // Enable auto-start
  plugins: string[];           // Plugin IDs to auto-start
}
```

## Resource Management

The plugin host enforces resource quotas:

- **Memory**: Maximum MB per plugin
- **CPU**: CPU time tracking and limits
- **Storage**: Storage quota per plugin
- **Network**: Network bandwidth limits

Violations are detected and can trigger automatic plugin disable.

## Security

### Sandboxing

All plugins run in isolated-vm sandboxes with:
- Memory limits
- No direct file system access
- Controlled network access
- No native module loading

### Permission System

Plugins must declare required permissions:

- `read:data` - Read data access
- `write:data` - Write data access
- `access:graph` - Graph database access
- `network:access` - Network access
- `ui:extensions` - UI extension capabilities

### Code Scanning

Automatic security scanning for:
- Known vulnerabilities
- Dangerous code patterns
- Dependency vulnerabilities
- Blacklisted plugins

## Development

```bash
# Build
pnpm build

# Development mode
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## License

MIT
