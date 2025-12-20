# Summit Plugin SDK Documentation

## Overview

The Summit Plugin SDK provides a comprehensive framework for building plugins that extend the Summit platform's capabilities. This guide covers everything you need to know to develop, test, and publish plugins.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Plugin Architecture](#plugin-architecture)
3. [SDK API Reference](#sdk-api-reference)
4. [Extension Points](#extension-points)
5. [Security & Permissions](#security--permissions)
6. [Testing](#testing)
7. [Publishing](#publishing)

## Getting Started

### Installation

```bash
npm install -g @summit/plugin-cli
```

### Create a New Plugin

```bash
summit-plugin create my-awesome-plugin
cd my-awesome-plugin
npm install
```

### Plugin Structure

```
my-awesome-plugin/
├── src/
│   └── index.ts          # Main plugin file
├── test/
│   └── index.test.ts     # Tests
├── dist/                 # Built output
├── plugin.json           # Plugin manifest
├── package.json
├── tsconfig.json
└── README.md
```

## Plugin Architecture

### Plugin Manifest

The `plugin.json` file defines your plugin's metadata and requirements:

```json
{
  "id": "my-awesome-plugin",
  "name": "My Awesome Plugin",
  "version": "1.0.0",
  "description": "An awesome plugin for Summit",
  "author": {
    "name": "Your Name",
    "email": "you@example.com"
  },
  "license": "MIT",
  "category": "analyzer",
  "main": "./dist/index.js",
  "engineVersion": ">=1.0.0",
  "permissions": [
    "read:data",
    "write:data"
  ],
  "resources": {
    "maxMemoryMB": 256,
    "maxCpuPercent": 50,
    "maxStorageMB": 100,
    "maxNetworkMbps": 10
  }
}
```

### Basic Plugin Structure

```typescript
import { createPlugin, PluginPermission } from '@summit/plugin-sdk';

export default createPlugin()
  .withMetadata({
    id: 'my-awesome-plugin',
    name: 'My Awesome Plugin',
    version: '1.0.0',
    description: 'An awesome plugin',
    author: { name: 'Your Name' },
    license: 'MIT',
    category: 'analyzer',
  })
  .requiresEngine('>=1.0.0')
  .withMain('./dist/index.js')
  .requestPermissions(
    PluginPermission.READ_DATA,
    PluginPermission.WRITE_DATA
  )
  .onInitialize(async (context) => {
    context.logger.info('Plugin initializing...');
    // Load configuration
    // Initialize connections
  })
  .onStart(async () => {
    console.log('Plugin started!');
  })
  .onStop(async () => {
    console.log('Plugin stopping...');
  })
  .build();
```

## SDK API Reference

### PluginContext

The plugin context provides access to platform services:

```typescript
interface PluginContext {
  pluginId: string;
  version: string;
  config: Record<string, any>;
  logger: PluginLogger;
  storage: PluginStorage;
  api: PluginAPI;
  events: PluginEventBus;
}
```

#### Logger

```typescript
context.logger.debug('Debug message', { metadata });
context.logger.info('Info message');
context.logger.warn('Warning message');
context.logger.error('Error message', error);
```

#### Storage

```typescript
// Store data
await context.storage.set('key', { data: 'value' });

// Retrieve data
const value = await context.storage.get('key');

// Check existence
const exists = await context.storage.has('key');

// Delete data
await context.storage.delete('key');

// List keys
const keys = await context.storage.keys();
```

#### API Client

```typescript
// Make HTTP request
const response = await context.api.request('/endpoint', {
  method: 'POST',
  body: { data: 'value' },
});

// GraphQL query
const data = await context.api.graphql(`
  query GetUsers {
    users {
      id
      name
    }
  }
`);
```

#### Event Bus

```typescript
// Listen to events
context.events.on('data:updated', async (data) => {
  console.log('Data updated:', data);
});

// Emit events
await context.events.emit('custom:event', { payload: 'data' });

// One-time listener
context.events.once('init:complete', () => {
  console.log('Initialization complete');
});
```

## Extension Points

### Data Source Extension

```typescript
import { BaseDataSourceExtension } from '@summit/extension-api';

export class MyDataSource extends BaseDataSourceExtension {
  constructor() {
    super('my-datasource', {
      host: 'localhost',
      port: 5432,
    });
  }

  async connect(): Promise<void> {
    // Connect to data source
  }

  async disconnect(): Promise<void> {
    // Disconnect
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  async execute(query: DataSourceQuery): Promise<DataSourceResult> {
    // Execute query and return results
    return {
      data: [],
      total: 0,
      hasMore: false,
    };
  }
}
```

### Analyzer Extension

```typescript
import { BaseAnalyzerExtension } from '@summit/extension-api';

export class MyAnalyzer extends BaseAnalyzerExtension {
  constructor() {
    super(
      'my-analyzer',
      'My Analyzer',
      'Analyzes data for patterns',
      ['text', 'json']
    );
  }

  async execute(input: AnalyzerInput): Promise<AnalyzerResult> {
    // Analyze data
    return {
      insights: [
        {
          type: 'pattern',
          description: 'Found interesting pattern',
          confidence: 0.95,
        },
      ],
      confidence: 0.95,
    };
  }
}
```

### Visualization Extension

```typescript
import { BaseVisualizationExtension } from '@summit/extension-api';

export class MyVisualization extends BaseVisualizationExtension {
  constructor() {
    super(
      'my-viz',
      'My Visualization',
      'Custom chart visualization',
      './components/MyChart.tsx'
    );
  }

  async execute(input: VisualizationData): Promise<VisualizationConfig> {
    return {
      component: 'MyChart',
      props: {
        data: input.data,
        options: input.config,
      },
      layout: {
        width: '100%',
        height: 400,
      },
    };
  }
}
```

## Security & Permissions

### Available Permissions

- `read:data` - Read access to data
- `write:data` - Write access to data
- `execute:queries` - Execute database queries
- `access:graph` - Access graph database
- `network:access` - Network/HTTP access
- `filesystem:access` - File system access
- `database:access` - Direct database access
- `api:endpoints` - Create API endpoints
- `ui:extensions` - Add UI extensions
- `analytics:access` - Access analytics
- `ml:models` - Access ML models
- `webhooks:manage` - Manage webhooks
- `tasks:schedule` - Schedule tasks

### Resource Limits

Specify resource limits in your manifest:

```json
{
  "resources": {
    "maxMemoryMB": 256,
    "maxCpuPercent": 50,
    "maxStorageMB": 100,
    "maxNetworkMbps": 10
  }
}
```

## Testing

### Unit Testing

```typescript
import { testPluginLifecycle, createMockContext } from '@summit/plugin-sdk';
import myPlugin from '../src/index';

describe('My Plugin', () => {
  test('lifecycle', async () => {
    await testPluginLifecycle(myPlugin);
  });

  test('initialization', async () => {
    const context = createMockContext();
    await myPlugin.initialize(context);
    // Assert initialization
  });
});
```

### Running Tests

```bash
npm test
npm test -- --coverage
```

## Publishing

### Validation

```bash
summit-plugin validate
```

### Building

```bash
summit-plugin build
```

### Publishing to Marketplace

```bash
summit-plugin publish
```

### Version Management

Follow semantic versioning (semver):

- MAJOR version for incompatible API changes
- MINOR version for backwards-compatible functionality
- PATCH version for backwards-compatible bug fixes

## Best Practices

1. **Error Handling**: Always handle errors gracefully
2. **Resource Cleanup**: Clean up resources in `destroy()`
3. **Logging**: Use the logger for debugging
4. **Versioning**: Follow semver strictly
5. **Documentation**: Document your plugin's API
6. **Testing**: Write comprehensive tests
7. **Security**: Request only necessary permissions
8. **Performance**: Monitor resource usage

## Examples

See the `/examples/plugins/` directory for complete example plugins:

- `example-data-source/` - Custom data source connector
- `example-analyzer/` - Custom analyzer
- `example-visualization/` - Custom visualization
- `example-workflow/` - Workflow action plugin

## Support

- Documentation: https://docs.summit.dev/plugins
- Community Forum: https://forum.summit.dev
- GitHub Issues: https://github.com/summit/plugins/issues
