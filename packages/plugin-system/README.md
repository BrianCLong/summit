# Summit Plugin System

Comprehensive plugin architecture for extending the Summit platform with third-party functionality.

## Features

- 🔌 **Microkernel Architecture** - Clean separation between core and extensions
- 🔒 **Sandboxed Execution** - Isolated VM contexts for security
- 🎯 **Extension Points** - 10+ extension types (data sources, analyzers, visualizations, etc.)
- 📦 **Dependency Management** - Automatic resolution and version checking
- 🔄 **Hot Reloading** - Update plugins without restart
- 🛡️ **Security Framework** - Code signing, permissions, resource quotas
- 📊 **Resource Monitoring** - Track memory, CPU, network usage
- 🚀 **Performance** - Optimized loading and caching
- 🔧 **Developer Tools** - SDK, CLI, templates, and examples
- 📚 **Comprehensive Docs** - Guides, API reference, examples

## Quick Start

### Installation

```bash
npm install @summit/plugin-system
```

### Create a Plugin

```bash
npx @summit/plugin-cli create my-plugin
cd my-plugin
npm install
npm run build
```

### Use the Plugin System

```typescript
import {
  PluginManager,
  DefaultPluginLoader,
  PluginSandbox,
  DefaultDependencyResolver,
  InMemoryPluginRegistry,
} from '@summit/plugin-system';

// Initialize components
const sandbox = new PluginSandbox();
const loader = new DefaultPluginLoader(sandbox);
const registry = new InMemoryPluginRegistry();
const resolver = new DefaultDependencyResolver('1.0.0');

// Create plugin manager
const manager = new PluginManager(loader, registry, resolver, '1.0.0');

// Install and enable plugin
await manager.install(manifest, source);
await manager.enable('my-plugin');

// Plugin is now active!
```

## Architecture

```
┌─────────────────────────────────────┐
│      PluginManager (Core)           │
│  - Lifecycle Management             │
│  - Dependency Resolution            │
│  - Hot Reloading                    │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌──────▼──────┐
│   Security  │  │  Sandbox    │
│  Framework  │  │  Execution  │
└─────────────┘  └─────────────┘
       │                │
       └────────┬───────┘
                │
    ┌───────────▼───────────┐
    │   Extension Points    │
    │  - Data Sources       │
    │  - Analyzers          │
    │  - Visualizations     │
    │  - Export Formats     │
    │  - Auth Providers     │
    └───────────────────────┘
```

## Core Components

### PluginManager

Central orchestrator for plugin lifecycle:

```typescript
const manager = new PluginManager(loader, registry, resolver, platformVersion);

// Install plugin
await manager.install(manifest, source);

// Enable plugin
await manager.enable('plugin-id');

// Disable plugin
await manager.disable('plugin-id');

// Update plugin
await manager.update('plugin-id', '2.0.0');

// Hot reload
await manager.reload('plugin-id');

// Health check
const health = await manager.checkHealth('plugin-id');
```

### PluginSandbox

Isolated execution environment:

```typescript
const sandbox = new PluginSandbox();

// Load plugin in sandbox
const plugin = await sandbox.loadPlugin(pluginPath, manifest);

// Get resource usage
const usage = await sandbox.getResourceUsage('plugin-id');
```

### PluginSecurity

Security scanning and enforcement:

```typescript
const security = new PluginSecurity();

// Verify signature
const valid = await security.verifySignature(
  pluginId,
  content,
  signature,
  publicKey
);

// Scan for vulnerabilities
const scanResult = await security.scanPlugin(pluginPath, manifest);

// Check permission
const allowed = security.checkPermission(
  manifest,
  PluginPermission.NETWORK_ACCESS,
  context
);
```

## Extension Points

### Data Source

```typescript
import { BaseDataSourceExtension } from '@summit/extension-api';

class MyDataSource extends BaseDataSourceExtension {
  async execute(query: DataSourceQuery): Promise<DataSourceResult> {
    // Implement data fetching
    return { data, total, hasMore };
  }
}
```

### Analyzer

```typescript
import { BaseAnalyzerExtension } from '@summit/extension-api';

class MyAnalyzer extends BaseAnalyzerExtension {
  async execute(input: AnalyzerInput): Promise<AnalyzerResult> {
    // Implement analysis
    return { insights, entities, relationships, confidence };
  }
}
```

### Visualization

```typescript
import { BaseVisualizationExtension } from '@summit/extension-api';

class MyVisualization extends BaseVisualizationExtension {
  async execute(input: VisualizationData): Promise<VisualizationConfig> {
    // Return component configuration
    return { component, props, layout };
  }
}
```

## Security

### Permissions

Plugins must declare required permissions:

```typescript
enum PluginPermission {
  READ_DATA = 'read:data',
  WRITE_DATA = 'write:data',
  NETWORK_ACCESS = 'network:access',
  FILE_SYSTEM = 'filesystem:access',
  // ... more permissions
}
```

### Resource Quotas

Enforce resource limits:

```typescript
{
  "resources": {
    "maxMemoryMB": 256,
    "maxCpuPercent": 50,
    "maxStorageMB": 100,
    "maxNetworkMbps": 10
  }
}
```

### Sandboxing

Plugins run in isolated VM contexts with:
- Memory limits
- CPU usage limits
- No direct file system access
- Controlled network access
- No native module loading

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Watch Mode

```bash
npm run dev
```

## Documentation

- [Architecture Overview](../../docs/plugins/ARCHITECTURE.md)
- [SDK Documentation](../../docs/plugins/SDK.md)
- [Developer Guide](../../docs/plugins/DEVELOPER_GUIDE.md)
- [Examples](../../examples/plugins/)

## License

MIT
