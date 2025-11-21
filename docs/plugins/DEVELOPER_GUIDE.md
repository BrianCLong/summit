# Summit Plugin Developer Guide

## Introduction

Welcome to the Summit Plugin Developer Guide. This comprehensive guide will walk you through creating, testing, and publishing plugins for the Summit platform.

## Quick Start

### Prerequisites

- Node.js >= 18.18
- npm or pnpm
- TypeScript knowledge
- Familiarity with Summit platform

### 5-Minute Plugin

Create your first plugin in 5 minutes:

```bash
# Install CLI
npm install -g @summit/plugin-cli

# Create plugin
summit-plugin create hello-world

# Navigate to directory
cd hello-world

# Install dependencies
npm install

# Build
npm run build

# Test
npm test
```

## Plugin Categories

### Data Source Connectors

Connect to external data sources:

```typescript
import { BaseDataSourceExtension } from '@summit/extension-api';

export class PostgresConnector extends BaseDataSourceExtension {
  private client: any;

  async connect() {
    this.client = new PostgresClient(this.config);
    await this.client.connect();
  }

  async execute(query: DataSourceQuery) {
    const result = await this.client.query(query.query, query.parameters);
    return {
      data: result.rows,
      total: result.rowCount,
      hasMore: false,
    };
  }
}
```

### Custom Analyzers

Build custom analysis algorithms:

```typescript
import { BaseAnalyzerExtension } from '@summit/extension-api';

export class SentimentAnalyzer extends BaseAnalyzerExtension {
  async execute(input: AnalyzerInput) {
    const sentiment = await this.analyzeSentiment(input.data);

    return {
      insights: [
        {
          type: 'sentiment',
          description: `Sentiment: ${sentiment.label}`,
          confidence: sentiment.score,
        },
      ],
      confidence: sentiment.score,
    };
  }

  private async analyzeSentiment(text: string) {
    // Implement sentiment analysis
    return { label: 'positive', score: 0.85 };
  }
}
```

### Visualization Widgets

Create custom visualizations:

```typescript
import { BaseVisualizationExtension } from '@summit/extension-api';

export class NetworkGraph extends BaseVisualizationExtension {
  async execute(input: VisualizationData) {
    const graphData = this.transformToGraph(input.data);

    return {
      component: 'NetworkGraph',
      props: {
        nodes: graphData.nodes,
        edges: graphData.edges,
        options: {
          physics: true,
          layout: 'force-directed',
        },
      },
    };
  }
}
```

## Advanced Topics

### Configuration Management

Define configuration schema:

```typescript
const configSchema = {
  type: 'object',
  properties: {
    apiKey: { type: 'string', secret: true },
    endpoint: { type: 'string', format: 'uri' },
    timeout: { type: 'number', default: 30000 },
  },
  required: ['apiKey', 'endpoint'],
};
```

Access configuration:

```typescript
onInitialize(async (context) => {
  const apiKey = context.config.apiKey;
  const endpoint = context.config.endpoint;
});
```

### State Management

Use plugin storage for state:

```typescript
async function saveState(context: PluginContext, state: any) {
  await context.storage.set('state', state);
}

async function loadState(context: PluginContext) {
  return await context.storage.get('state');
}
```

### Event Handling

Subscribe to platform events:

```typescript
onInitialize(async (context) => {
  // Listen for data updates
  context.events.on('entity:created', async (entity) => {
    await processNewEntity(entity);
  });

  // Listen for user actions
  context.events.on('user:action', async (action) => {
    await logAction(action);
  });
});
```

Emit custom events:

```typescript
async function notifyAnalysisComplete(context: PluginContext, results: any) {
  await context.events.emit('analysis:complete', {
    pluginId: context.pluginId,
    results,
    timestamp: new Date(),
  });
}
```

### API Endpoints

Add custom API endpoints:

```typescript
import { Endpoint } from '@summit/plugin-sdk';

class MyPlugin {
  @Endpoint({ method: 'POST', path: '/analyze' })
  async analyze(req: any, res: any) {
    const { data } = req.body;
    const result = await this.performAnalysis(data);
    res.json(result);
  }

  @Endpoint({ method: 'GET', path: '/status' })
  async getStatus(req: any, res: any) {
    res.json({ status: 'healthy' });
  }
}
```

### Webhooks

Handle webhook events:

```typescript
import { WebhookHandler } from '@summit/plugin-sdk';

class MyPlugin {
  @WebhookHandler('investigation:created')
  async onInvestigationCreated(event: any) {
    console.log('New investigation:', event.data);
    await this.processInvestigation(event.data);
  }

  @WebhookHandler('entity:updated')
  async onEntityUpdated(event: any) {
    await this.reindexEntity(event.data);
  }
}
```

### Dependency Management

Declare dependencies in manifest:

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "lodash": "^4.17.21"
  },
  "peerDependencies": {
    "@summit/plugin-system": "^1.0.0"
  }
}
```

### Hot Reloading

Support hot reloading for development:

```typescript
if (module.hot) {
  module.hot.accept();

  module.hot.dispose((data) => {
    // Clean up before reload
    data.state = getCurrentState();
  });

  if (module.hot.data) {
    // Restore state after reload
    restoreState(module.hot.data.state);
  }
}
```

## Performance Optimization

### Caching

```typescript
class MyPlugin {
  private cache = new Map();

  async getData(key: string) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const data = await this.fetchData(key);
    this.cache.set(key, data);
    return data;
  }
}
```

### Lazy Loading

```typescript
class MyPlugin {
  private heavyModule: any;

  async getHeavyModule() {
    if (!this.heavyModule) {
      this.heavyModule = await import('./heavy-module');
    }
    return this.heavyModule;
  }
}
```

### Resource Management

```typescript
onInitialize(async (context) => {
  // Set up resource cleanup
  this.connections = [];

  context.events.on('plugin:stop', async () => {
    // Clean up all connections
    await Promise.all(
      this.connections.map(conn => conn.close())
    );
  });
});
```

## Security Best Practices

### Input Validation

```typescript
import { z } from 'zod';

const InputSchema = z.object({
  query: z.string().max(1000),
  limit: z.number().int().min(1).max(100),
});

async function processQuery(input: unknown) {
  const validated = InputSchema.parse(input);
  // Safe to use validated data
}
```

### Secret Management

```typescript
onInitialize(async (context) => {
  // Never log secrets
  const apiKey = context.config.apiKey;

  // Use secrets safely
  const client = new APIClient({
    apiKey, // Pass to client, don't log
  });
});
```

### Rate Limiting

```typescript
import { RateLimiter } from 'rate-limiter-flexible';

const limiter = new RateLimiter({
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
});

async function handleRequest(userId: string) {
  try {
    await limiter.consume(userId);
    // Process request
  } catch (error) {
    throw new Error('Rate limit exceeded');
  }
}
```

## Testing Strategies

### Unit Tests

```typescript
import { createMockContext } from '@summit/plugin-sdk';

describe('MyPlugin', () => {
  let plugin: MyPlugin;
  let context: PluginContext;

  beforeEach(() => {
    context = createMockContext();
    plugin = new MyPlugin();
  });

  test('initializes correctly', async () => {
    await plugin.initialize(context);
    expect(plugin.isInitialized).toBe(true);
  });

  test('processes data correctly', async () => {
    const result = await plugin.processData({ input: 'test' });
    expect(result).toMatchObject({ success: true });
  });
});
```

### Integration Tests

```typescript
describe('Integration Tests', () => {
  test('integrates with platform', async () => {
    const manager = new PluginManager(...);
    await manager.install(pluginManifest);
    await manager.enable('my-plugin');

    const plugin = manager.get('my-plugin');
    expect(plugin).toBeDefined();
  });
});
```

### E2E Tests

```typescript
describe('E2E Tests', () => {
  test('complete workflow', async () => {
    // Install plugin
    await cli.run(['install', 'my-plugin']);

    // Configure plugin
    await cli.run(['config', 'my-plugin', '--key=value']);

    // Test plugin functionality
    const result = await testPluginEndpoint();
    expect(result.status).toBe(200);
  });
});
```

## Debugging

### Enable Debug Logging

```typescript
onInitialize(async (context) => {
  if (process.env.DEBUG) {
    context.logger.debug('Debug mode enabled');
    context.logger.debug('Config:', context.config);
  }
});
```

### Use Debugger

Add breakpoints in TypeScript:

```typescript
async function processData(data: any) {
  debugger; // Breakpoint
  const result = await transform(data);
  return result;
}
```

### Monitor Performance

```typescript
async function timedOperation(name: string, fn: () => Promise<any>) {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const duration = Date.now() - start;
    console.log(`${name} took ${duration}ms`);
  }
}
```

## Publishing Checklist

- [ ] All tests passing
- [ ] Documentation complete
- [ ] Version number updated
- [ ] Changelog updated
- [ ] Security scan passed
- [ ] Performance tested
- [ ] README updated
- [ ] License included
- [ ] Examples provided

## Resources

- [SDK Reference](./SDK.md)
- [API Documentation](./API.md)
- [Example Plugins](../../examples/plugins/)
- [Community Forum](https://forum.summit.dev)
- [GitHub](https://github.com/summit/plugins)

## Getting Help

- Join our Discord: https://discord.gg/summit
- Stack Overflow: Tag with `summit-plugins`
- GitHub Discussions: https://github.com/summit/plugins/discussions
- Email Support: plugins@summit.dev
