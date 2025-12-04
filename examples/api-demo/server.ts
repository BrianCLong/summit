/**
 * Summit API Framework Demo
 *
 * Complete example demonstrating REST, Query Language, and Streaming APIs
 */

import { createSummitAPI } from '../../packages/api-framework/src';
import {
  NotFoundException,
  ValidationException,
  validate,
  generateHATEOASLinks,
  addPaginationMetadata,
} from '../../packages/rest-api/src';

// Mock database
const mockDB = {
  entities: new Map([
    ['1', { id: '1', name: 'John Doe', type: 'Person', country: 'US', riskScore: 7.5 }],
    ['2', { id: '2', name: 'Acme Corp', type: 'Organization', country: 'UK', riskScore: 8.2 }],
    ['3', { id: '3', name: 'Jane Smith', type: 'Person', country: 'CA', riskScore: 5.1 }],
  ]),

  relationships: new Map([
    ['r1', { id: 'r1', sourceId: '1', targetId: '2', type: 'WORKS_FOR' }],
    ['r2', { id: 'r2', sourceId: '3', targetId: '2', type: 'PARTNER_OF' }],
  ]),
};

// Create API
const api = createSummitAPI({
  rest: {
    version: '1.0.0',
    title: 'Summit Intelligence API Demo',
    description: 'Demonstration of Summit API Framework capabilities',
    basePath: '/api/v1',
    cors: {
      enabled: true,
      origin: '*',
    },
    rateLimit: {
      enabled: true,
      windowMs: 60000,
      max: 100,
    },
    pagination: {
      defaultLimit: 10,
      maxLimit: 100,
      strategy: 'offset',
    },
    openapi: {
      enabled: true,
      path: '/openapi.json',
      uiPath: '/docs',
    },
  },
  streaming: {
    websocket: {
      enabled: true,
      path: '/ws',
    },
    sse: {
      enabled: true,
      path: '/stream',
    },
  },
  queryLanguage: {
    enabled: true,
    endpoint: '/query',
  },
});

// ===== REST API Routes =====

// Entity routes
api.rest.router.resource('entities', {
  // List entities
  list: async (req, res) => {
    const { limit, offset } = req.pagination!;
    const typeFilter = req.query.type as string | undefined;

    let entities = Array.from(mockDB.entities.values());

    // Apply type filter
    if (typeFilter) {
      entities = entities.filter(e => e.type === typeFilter);
    }

    const total = entities.length;
    const paginated = entities.slice(offset, offset + limit);

    const pagination = addPaginationMetadata(req, total, paginated.length);
    req.pagination = pagination;

    const links = generateHATEOASLinks(req);

    res.success(paginated, { links });
  },

  // Get entity by ID
  get: async (req, res) => {
    const entity = mockDB.entities.get(req.params.id);

    if (!entity) {
      throw new NotFoundException('Entity');
    }

    res.success(entity);
  },

  // Create entity
  create: async (req, res) => {
    const id = String(mockDB.entities.size + 1);
    const entity = { id, ...req.body };

    mockDB.entities.set(id, entity);

    // Broadcast to streaming clients
    api.websocket?.broadcast('entities', {
      id: `event-${Date.now()}`,
      topic: 'entities',
      type: 'created',
      data: entity,
      timestamp: new Date(),
    });

    api.sse?.broadcast('entities', {
      id: `event-${Date.now()}`,
      topic: 'entities',
      type: 'created',
      data: entity,
      timestamp: new Date(),
    });

    res.success(entity, { statusCode: 201 });
  },

  // Update entity
  update: async (req, res) => {
    const entity = mockDB.entities.get(req.params.id);

    if (!entity) {
      throw new NotFoundException('Entity');
    }

    const updated = { ...entity, ...req.body };
    mockDB.entities.set(req.params.id, updated);

    // Broadcast update
    api.websocket?.broadcast('entities', {
      id: `event-${Date.now()}`,
      topic: 'entities',
      type: 'updated',
      data: updated,
      timestamp: new Date(),
    });

    res.success(updated);
  },

  // Delete entity
  delete: async (req, res) => {
    const entity = mockDB.entities.get(req.params.id);

    if (!entity) {
      throw new NotFoundException('Entity');
    }

    mockDB.entities.delete(req.params.id);

    // Broadcast deletion
    api.websocket?.broadcast('entities', {
      id: `event-${Date.now()}`,
      topic: 'entities',
      type: 'deleted',
      data: { id: req.params.id },
      timestamp: new Date(),
    });

    res.status(204).send();
  },
}, {
  openapi: {
    list: {
      summary: 'List all entities',
      description: 'Returns a paginated list of intelligence entities',
      tags: ['entities'],
      parameters: [{
        name: 'type',
        in: 'query',
        schema: { type: 'string', enum: ['Person', 'Organization'] },
        description: 'Filter by entity type',
      }],
      responses: {
        '200': {
          description: 'List of entities',
        },
      },
    },
    get: {
      summary: 'Get entity by ID',
      description: 'Returns detailed information about a specific entity',
      tags: ['entities'],
      responses: {
        '200': { description: 'Entity details' },
        '404': { description: 'Entity not found' },
      },
    },
    create: {
      summary: 'Create new entity',
      description: 'Creates a new intelligence entity',
      tags: ['entities'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string', enum: ['Person', 'Organization'] },
                country: { type: 'string' },
                riskScore: { type: 'number', minimum: 0, maximum: 10 },
              },
              required: ['name', 'type'],
            },
          },
        },
      },
      responses: {
        '201': { description: 'Entity created' },
        '400': { description: 'Validation error' },
      },
    },
  },
});

// Relationship routes
api.rest.router.get('/relationships', async (req, res) => {
  const relationships = Array.from(mockDB.relationships.values());
  res.success(relationships);
}, {
  openapi: {
    summary: 'List relationships',
    tags: ['relationships'],
    responses: {
      '200': { description: 'List of relationships' },
    },
  },
});

// Statistics endpoint
api.rest.router.get('/stats', async (req, res) => {
  const stats = {
    entities: {
      total: mockDB.entities.size,
      byType: Array.from(mockDB.entities.values()).reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    },
    relationships: {
      total: mockDB.relationships.size,
    },
    streaming: {
      websocket: api.websocket?.getStatistics(),
      sse: api.sse?.getStatistics(),
    },
  };

  res.success(stats);
}, {
  openapi: {
    summary: 'Get platform statistics',
    tags: ['statistics'],
    responses: {
      '200': { description: 'Platform statistics' },
    },
  },
});

// ===== Streaming API Events =====

// Handle WebSocket subscriptions
api.websocket?.on('subscribe', ({ connectionId, topic, filter }) => {
  console.log(`[WebSocket] ${connectionId} subscribed to ${topic}`, filter);
});

api.websocket?.on('unsubscribe', ({ connectionId, topic }) => {
  console.log(`[WebSocket] ${connectionId} unsubscribed from ${topic}`);
});

api.websocket?.on('connection', (connection) => {
  console.log(`[WebSocket] New connection: ${connection.id}`);
});

api.websocket?.on('disconnection', (connection) => {
  console.log(`[WebSocket] Disconnected: ${connection.id}`);
});

// Handle SSE subscriptions
api.sse?.on('subscribe', ({ connectionId, topic }) => {
  console.log(`[SSE] ${connectionId} subscribed to ${topic}`);
});

api.sse?.on('connection', (connection) => {
  console.log(`[SSE] New connection: ${connection.id}`);
});

// Simulate real-time events
setInterval(() => {
  const entity = Array.from(mockDB.entities.values())[
    Math.floor(Math.random() * mockDB.entities.size)
  ];

  if (entity && api.websocket && api.sse) {
    const event = {
      id: `event-${Date.now()}`,
      topic: 'entities',
      type: 'heartbeat',
      data: {
        entityId: entity.id,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    };

    api.websocket.broadcast('entities', event);
    api.sse.broadcast('entities', event);
  }
}, 10000); // Every 10 seconds

// ===== Start Server =====

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

console.log('\n' + '='.repeat(60));
console.log('Summit API Framework - Demo Server');
console.log('='.repeat(60) + '\n');

api.start(PORT);

console.log('Try these examples:\n');
console.log('REST API:');
console.log(`  curl http://localhost:${PORT}/api/v1/entities`);
console.log(`  curl http://localhost:${PORT}/api/v1/stats\n`);

console.log('Query Language:');
console.log(`  curl -X POST http://localhost:${PORT}/api/v1/query \\`);
console.log(`    -H "Content-Type: application/json" \\`);
console.log(`    -d '{"query":"query { from: entities where: type = \\\\"Person\\\\" limit: 10 }"}'\n`);

console.log('WebSocket:');
console.log(`  wscat -c ws://localhost:${PORT}/ws`);
console.log(`  > {"type":"subscribe","id":"sub-1","topic":"entities"}\n`);

console.log('Server-Sent Events:');
console.log(`  curl http://localhost:${PORT}/stream?topics=entities\n`);

console.log('='.repeat(60) + '\n');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await api.stop();
  process.exit(0);
});
