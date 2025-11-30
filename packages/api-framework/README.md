# Summit API Framework

Unified API framework combining REST, Query Language, and Streaming APIs.

## Features

- **Unified Platform**: Single framework for REST, query language, and streaming
- **REST API**: Full-featured RESTful endpoints with OpenAPI
- **Query Language**: Declarative SummitQL for complex queries
- **Streaming API**: Real-time data delivery via WebSocket and SSE
- **GraphQL Ready**: Easy integration with GraphQL APIs
- **Security**: Built-in authentication, authorization, and rate limiting
- **Monitoring**: Request metrics and analytics
- **Documentation**: Automatic API documentation generation
- **Type Safety**: Full TypeScript support

## Installation

```bash
npm install @intelgraph/api-framework
```

## Quick Start

```typescript
import { createSummitAPI } from '@intelgraph/api-framework';

const api = createSummitAPI({
  rest: {
    version: '1.0.0',
    title: 'My API',
    basePath: '/api/v1',
  },
  streaming: {
    websocket: { enabled: true },
    sse: { enabled: true },
  },
  queryLanguage: {
    enabled: true,
    endpoint: '/query',
  },
});

// Define REST routes
api.rest.router.get('/entities', async (req, res) => {
  const entities = await db.entities.find();
  res.success(entities);
});

// Handle streaming events
api.websocket?.on('subscribe', ({ connectionId, topic }) => {
  console.log(`${connectionId} subscribed to ${topic}`);
});

// Start server
api.start(3000);
```

## Architecture

```
Summit API Framework
├── REST API
│   ├── Resource routing
│   ├── OpenAPI docs
│   ├── Validation
│   └── Pagination
├── Query Language
│   ├── Parser
│   ├── Compiler
│   ├── Optimizer
│   └── Executor
└── Streaming API
    ├── WebSocket
    └── SSE
```

## Documentation

- [API Framework Guide](../../docs/api-reference/API_FRAMEWORK.md)
- [Query Language Guide](../../docs/api-reference/QUERY_LANGUAGE_GUIDE.md)
- [REST API Guide](../../docs/api-reference/REST_API_GUIDE.md)
- [Streaming API Guide](../../docs/api-reference/STREAMING_API_GUIDE.md)

## Examples

See the [demo server](../../examples/api-demo/server.ts) for a complete example.

## License

MIT
