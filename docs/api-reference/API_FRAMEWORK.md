# Summit API Framework

## Overview

The Summit API Framework provides a unified, enterprise-grade API platform that combines:

- **REST API**: Full-featured RESTful endpoints with OpenAPI 3.0 specification
- **Query Language**: Declarative SummitQL for complex intelligence queries
- **Streaming API**: Real-time data delivery via WebSocket and Server-Sent Events
- **GraphQL**: Type-safe GraphQL API with subscriptions (optional)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Summit API Framework                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   REST API   │  │   Query Lang │  │  Streaming   │      │
│  │              │  │              │  │              │      │
│  │  • OpenAPI   │  │  • Parser    │  │  • WebSocket │      │
│  │  • Versioning│  │  • Compiler  │  │  • SSE       │      │
│  │  • Pagination│  │  • Optimizer │  │  • Real-time │      │
│  │  • HATEOAS   │  │  • Executor  │  │  • Backpres. │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                    Common Infrastructure                      │
│  • Authentication & Authorization (JWT, OAuth, API Keys)     │
│  • Rate Limiting & Throttling                                │
│  • Request Validation                                        │
│  • Error Handling                                            │
│  • Monitoring & Analytics                                    │
│  • Caching & Performance                                     │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Installation

```bash
npm install @intelgraph/api-framework
```

### Basic Setup

```typescript
import { createSummitAPI } from '@intelgraph/api-framework';

const api = createSummitAPI({
  rest: {
    version: '1.0.0',
    title: 'Summit Intelligence API',
    description: 'API for intelligence analysis platform',
    basePath: '/api/v1',
  },
  streaming: {
    websocket: { enabled: true, path: '/ws' },
    sse: { enabled: true, path: '/stream' },
  },
  queryLanguage: {
    enabled: true,
    endpoint: '/query',
  },
});

// Define REST routes
api.rest.router
  .get('/entities', async (req, res) => {
    const entities = await db.entities.find();
    res.success(entities);
  }, {
    openapi: {
      summary: 'List entities',
      tags: ['entities'],
      responses: {
        '200': { description: 'List of entities' }
      }
    }
  });

// Handle streaming events
api.websocket?.on('subscribe', ({ connectionId, topic }) => {
  console.log(`${connectionId} subscribed to ${topic}`);
});

// Start server
api.start(3000);
```

## REST API Features

### Resource Routes

```typescript
api.rest.router.resource('entities', {
  list: async (req, res) => {
    const entities = await db.entities.find();
    res.success(entities);
  },
  get: async (req, res) => {
    const entity = await db.entities.findById(req.params.id);
    if (!entity) throw new NotFoundException('Entity');
    res.success(entity);
  },
  create: async (req, res) => {
    const entity = await db.entities.create(req.body);
    res.success(entity, { statusCode: 201 });
  },
  update: async (req, res) => {
    const entity = await db.entities.update(req.params.id, req.body);
    res.success(entity);
  },
  delete: async (req, res) => {
    await db.entities.delete(req.params.id);
    res.status(204).send();
  },
});
```

### Validation

```typescript
import { validate } from '@intelgraph/rest-api';

api.rest.router.post('/entities', [
  validate({
    body: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 255 },
        type: { type: 'string', enum: ['Person', 'Organization'] },
        country: { type: 'string', pattern: '^[A-Z]{2}$' },
      },
      required: ['name', 'type'],
    },
  }),
], async (req, res) => {
  const entity = await db.entities.create(req.validated!.body);
  res.success(entity, { statusCode: 201 });
});
```

### Pagination

```typescript
api.rest.router.get('/entities', async (req, res) => {
  const { limit, offset } = req.pagination!;

  const entities = await db.entities
    .find()
    .limit(limit)
    .skip(offset);

  const total = await db.entities.count();

  const links = generateHATEOASLinks(req, {
    total,
    hasMore: offset + entities.length < total,
  });

  res.success(entities, { links });
});
```

### Error Handling

```typescript
import {
  NotFoundException,
  ValidationException,
  UnauthorizedException,
} from '@intelgraph/rest-api';

api.rest.router.get('/entities/:id', async (req, res) => {
  const entity = await db.entities.findById(req.params.id);

  if (!entity) {
    throw new NotFoundException('Entity');
  }

  if (!hasPermission(req.user, entity)) {
    throw new UnauthorizedException('Access denied');
  }

  res.success(entity);
});
```

## Query Language

### Executing Queries

```typescript
// POST /api/v1/query
{
  "query": "query { from: entities where: type = \"Person\" limit: 100 }",
  "cache": true,
  "stream": false
}
```

### Streaming Queries

```typescript
// POST /api/v1/query
{
  "query": "query { from: events where: timestamp >= \"2024-01-01\" }",
  "stream": true
}

// Response: NDJSON stream
{"type":"data","data":{...}}
{"type":"data","data":{...}}
{"type":"complete"}
```

### Query Validation

```typescript
// POST /api/v1/query/validate
{
  "query": "query { from: entities where: invalid syntax }"
}

// Response
{
  "success": false,
  "data": {
    "valid": false,
    "errors": [{
      "message": "Syntax error at line 1",
      "code": "PARSE_ERROR"
    }]
  }
}
```

## Streaming API

### WebSocket

```typescript
// Client connection
const ws = new WebSocket('ws://localhost:3000/ws');

// Subscribe to topic
ws.send(JSON.stringify({
  type: 'subscribe',
  id: 'sub-1',
  topic: 'entities',
  filter: { type: 'Person' }
}));

// Receive events
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'data') {
    console.log('New event:', message.event);
  }
};

// Server broadcasting
api.websocket?.broadcast('entities', {
  id: 'event-123',
  topic: 'entities',
  type: 'created',
  data: { id: '1', name: 'John Doe' },
  timestamp: new Date(),
});
```

### Server-Sent Events

```typescript
// Client connection
const eventSource = new EventSource(
  'http://localhost:3000/stream?topics=entities,relationships'
);

eventSource.addEventListener('data', (event) => {
  const data = JSON.parse(event.data);
  console.log('Event:', data);
});

// Server broadcasting
api.sse?.broadcast('entities', {
  id: 'event-123',
  topic: 'entities',
  type: 'updated',
  data: { id: '1', name: 'Jane Doe' },
  timestamp: new Date(),
});
```

## Security

### Authentication

```typescript
import jwt from 'jsonwebtoken';

// JWT middleware
const authenticate = async (req, res, next) => {
  const token = req.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    throw new UnauthorizedException('Missing token');
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = payload;
    next();
  } catch (error) {
    throw new UnauthorizedException('Invalid token');
  }
};

// Protected routes
api.rest.router.get('/entities', authenticate, async (req, res) => {
  // Only authenticated users
});
```

### Rate Limiting

```typescript
api.rest.router.get('/entities', async (req, res) => {
  // Rate limiting applied automatically based on config
}, {
  rateLimit: {
    windowMs: 60000, // 1 minute
    max: 100, // 100 requests per minute
  }
});
```

### Scope-Based Access

```typescript
const requireScope = (scope: string) => {
  return (req, res, next) => {
    if (!req.user?.scopes?.includes(scope)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    next();
  };
};

api.rest.router.post('/entities', [
  authenticate,
  requireScope('entities:write'),
], async (req, res) => {
  // Only users with entities:write scope
});
```

## Monitoring & Analytics

### Request Metrics

```typescript
import { metricsMiddleware, MemoryMetricsCollector } from '@intelgraph/rest-api';

const metrics = new MemoryMetricsCollector();

// Get statistics
api.rest.router.get('/metrics', authenticate, (req, res) => {
  const stats = metrics.getStats();
  res.json(stats);
});

// Statistics include:
// - Total requests
// - Error rate
// - Average duration
// - Status code distribution
// - Endpoint usage
```

### Health Checks

```http
GET /health
Response: { "status": "ok", "timestamp": "..." }

GET /ready
Response: { "status": "ready", "timestamp": "..." }
```

## API Versioning

### URL-based Versioning

```
/api/v1/entities
/api/v2/entities
```

### Header-based Versioning

```http
GET /api/entities
API-Version: 2.0
```

### Deprecation Warnings

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 31 Dec 2024 23:59:59 GMT
Link: </api/v2/entities>; rel="successor-version"
```

## OpenAPI Documentation

### Accessing Documentation

- OpenAPI Spec: `http://localhost:3000/openapi.json`
- Swagger UI: `http://localhost:3000/docs`

### Custom OpenAPI Metadata

```typescript
api.rest.router.get('/entities', async (req, res) => {
  // ...
}, {
  openapi: {
    summary: 'List all entities',
    description: 'Returns a paginated list of intelligence entities',
    tags: ['entities'],
    parameters: [{
      name: 'type',
      in: 'query',
      schema: { type: 'string' },
      description: 'Filter by entity type'
    }],
    responses: {
      '200': {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/EntityList' }
          }
        }
      }
    }
  }
});
```

## Best Practices

### 1. Use Appropriate HTTP Methods

- `GET` - Retrieve resources (idempotent, cacheable)
- `POST` - Create resources (non-idempotent)
- `PUT` - Replace resources (idempotent)
- `PATCH` - Update resources partially (idempotent)
- `DELETE` - Remove resources (idempotent)

### 2. Return Appropriate Status Codes

- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `429` - Too Many Requests
- `500` - Internal Server Error

### 3. Use Pagination

Always paginate large result sets:

```typescript
api.rest.router.get('/entities', async (req, res) => {
  const { limit, offset } = req.pagination!;
  // Use limit and offset
});
```

### 4. Enable Caching

```typescript
api.rest.router.get('/entities/:id', async (req, res) => {
  // ...
}, {
  cache: {
    enabled: true,
    ttl: 3600, // 1 hour
  }
});
```

### 5. Validate Input

Always validate request data:

```typescript
api.rest.router.post('/entities', [
  validate({ body: entitySchema }),
], async (req, res) => {
  // req.validated.body is validated
});
```

### 6. Handle Errors Properly

```typescript
api.rest.router.get('/entities/:id', async (req, res) => {
  const entity = await db.entities.findById(req.params.id);

  if (!entity) {
    throw new NotFoundException('Entity');
  }

  res.success(entity);
});
```

### 7. Use HATEOAS

Include links in responses:

```typescript
const links = generateHATEOASLinks(req);
res.success(data, { links });
```

### 8. Document Everything

Provide OpenAPI documentation for all endpoints.

## Performance Optimization

### 1. Query Optimization

Use the query language optimizer:

```typescript
const ql = new SummitQL({
  optimize: true,
  target: 'postgres', // or 'neo4j', 'elasticsearch'
});
```

### 2. Connection Pooling

Configure database connection pools appropriately.

### 3. Caching Strategy

- Cache frequently-accessed data
- Use appropriate TTLs
- Invalidate cache on updates

### 4. Compression

Compression is enabled by default for all responses.

### 5. Rate Limiting

Protect your API from abuse:

```typescript
rateLimit: {
  enabled: true,
  windowMs: 60000,
  max: 100
}
```

## See Also

- [Query Language Guide](./QUERY_LANGUAGE_GUIDE.md)
- [REST API Guide](./REST_API_GUIDE.md)
- [Streaming API Guide](./STREAMING_API_GUIDE.md)
- [Security Guide](./SECURITY_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
