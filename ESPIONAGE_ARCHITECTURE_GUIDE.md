# Summit Platform Architecture Patterns Guide

Based on comprehensive exploration of the codebase, here's a detailed guide for building the espionage platform following established patterns.

## 1. OVERALL ARCHITECTURE & PACKAGE ORGANIZATION

### Monorepo Structure
The project uses a **pnpm workspaces monorepo** with clear separation:

```
summit/
├── apps/                    # Standalone applications (server, client, web, etc.)
├── services/                # Microservices (100+ services)
├── packages/                # Shared libraries and utilities
├── contracts/               # Data contracts and interfaces
├── observability/           # Monitoring, logging, metrics
├── scripts/                 # CI/CD, deployment, utility scripts
├── data/                    # Seed data and fixtures
└── docker-compose.*.yml     # Environment orchestration
```

### Path Aliases (tsconfig.paths.json)
```json
{
  "@apps/*": ["apps/*/src"],
  "@packages/*": ["packages/*/src"],
  "@services/*": ["services/*/src"],
  "@contracts/*": ["contracts/*/src"]
}
```

### Package.json Configuration
- **Type**: ES modules (`"type": "module"`)
- **Build**: TypeScript compilation to `dist/`
- **Exports**: Both `import` and `types` fields
- **Package manager**: pnpm 9.12.0+

## 2. EXISTING SERVICE STRUCTURE (Examples)

### Example: API Service (`/services/api/`)
**Structure**:
```
services/api/
├── src/
│   ├── index.ts              # Entry point
│   ├── app.ts                # Express + Apollo setup
│   ├── db/                   # Database adapters
│   │   ├── neo4j.ts
│   │   ├── postgres.ts
│   │   ├── redis.ts
│   │   └── timescale.ts
│   ├── graphql/
│   │   ├── schema.ts         # GraphQL type definitions
│   │   ├── resolvers/        # Query/mutation handlers
│   │   ├── context.ts        # Context setup
│   │   ├── abac.ts           # Attribute-based access control
│   │   └── persisted.ts      # Persisted queries
│   ├── middleware/
│   │   ├── auth.ts           # JWT verification
│   │   ├── tenant.ts         # Tenant isolation
│   │   ├── audit.ts          # Audit logging
│   │   ├── rateLimit.ts      # Rate limiting
│   │   └── auditLog.ts
│   ├── routes/               # REST endpoints
│   │   ├── ingest.ts
│   │   ├── copilot.ts
│   │   ├── cases.ts
│   │   ├── evidence.ts
│   │   └── admin.ts
│   ├── realtime/
│   │   └── socket.ts         # Socket.IO handlers
│   └── utils/
│       └── logger.ts
├── package.json
└── tsconfig.json
```

**Pattern**: Services are organized by concern (db, graphql, middleware, routes, utils).

### Example: Gateway Service (`/services/authz-gateway/`)
**Structure** (simpler service):
```
services/authz-gateway/
├── src/
│   ├── index.ts              # Exports main function
│   ├── auth.ts               # Authentication logic
│   ├── types.ts              # Type definitions
│   ├── middleware.ts         # Custom middleware
│   ├── attribute-service.ts  # Business logic class
│   └── observability.ts      # Observability setup
├── tests/
│   ├── auth.test.ts
│   ├── security.test.ts
│   └── fuzz/
│       └── governance-gate.fuzz.test.ts
├── jest.config.cjs
└── package.json
```

**Pattern**: Focused, single-responsibility services with clear separation of concerns.

### Service Entry Point Pattern
```typescript
// src/index.ts - typical service entry
import express from 'express';
import { logger } from './utils/logger';

export async function createApp(): Promise<express.Application> {
  const app = express();
  
  // Setup middleware
  app.use(express.json());
  app.use(customMiddleware);
  
  // Setup routes
  app.post('/api/endpoint', async (req, res) => {
    // Handler logic
  });
  
  return app;
}

// Start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  createApp().then(app => {
    const port = process.env.PORT || 4000;
    app.listen(port, () => logger.info(`Service listening on ${port}`));
  });
}
```

## 3. DATABASE SCHEMA PATTERNS & REPOSITORIES

### Database Adapters Pattern
The API service demonstrates using multiple databases:

**PostgreSQL Adapter** (`/services/api/src/db/postgres.ts`):
```typescript
// Typical pattern: connection pool + CRUD methods
class PostgresPool {
  async findOne(table: string, where: Record<string, any>) {
    // Find single record
  }
  
  async find(table: string, where?: Record<string, any>) {
    // Find multiple records
  }
  
  async insert(table: string, data: Record<string, any>) {
    // Create record
  }
  
  async update(table: string, data: Record<string, any>, where: Record<string, any>) {
    // Update record
  }
}

export const postgresPool = new PostgresPool();
```

**Redis Adapter** (`/services/api/src/db/redis.ts`):
```typescript
class RedisClient {
  async get<T>(key: string): Promise<T | null> {
    // Get cached value
  }
  
  async set(key: string, value: any, ttl?: number): Promise<void> {
    // Set cached value with optional TTL
  }
  
  async exists(key: string): Promise<boolean> {
    // Check existence
  }
}

export const redisClient = new RedisClient();
```

**Neo4j Pattern** (graph database):
- Used for relationship/entity storage
- Separate adapter following same pattern

### Types Pattern with Zod Schemas
**From `/packages/common-types/src/types.ts`**:
```typescript
import { z } from 'zod';

// Schema definition (runtime validation)
export const entitySchema = z.object({
  id: z.string(),
  kind: z.enum(entityKinds as unknown as [string, ...string[]]),
  payload: z.record(z.string(), z.unknown()),
  observedAt: z.string().datetime(),
  tenantId: z.string(),
  policyLabels: z.array(z.string()).default([]),
  provenance: z.object({
    chain: z.array(z.string()),
  }).default({ chain: [] }),
});

// TypeScript type inference from schema
export type Entity = z.infer<typeof entitySchema>;
```

**Benefits**:
- Single source of truth for validation and types
- Runtime validation of API inputs
- Auto-generated JSON schemas via `zod-to-json-schema`

## 4. API ENDPOINT PATTERNS

### Express Routes Pattern
Routes are typically in separate modules:

**Standard REST Route** (`/services/api/src/routes/cases.ts`):
```typescript
import express from 'express';
import { requirePermission } from '../middleware/auth.js';

export const casesRouter = express.Router();

// List cases
casesRouter.get('/', 
  requirePermission('investigation:read'),
  async (req, res) => {
    try {
      const cases = await getCasesFromDB(req.user.tenantId);
      res.json(cases);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Create case
casesRouter.post('/',
  requirePermission('investigation:create'),
  async (req, res) => {
    try {
      const newCase = await createCase(req.body, req.user);
      res.status(201).json(newCase);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Get single case
casesRouter.get('/:id',
  requirePermission('investigation:read'),
  async (req, res) => {
    try {
      const caseData = await getCaseById(req.params.id, req.user.tenantId);
      res.json(caseData);
    } catch (error) {
      res.status(404).json({ error: 'Not found' });
    }
  }
);
```

### GraphQL Pattern (Apollo Server)
**Schema Definition** (`/services/api/src/graphql/schema.ts`):
```typescript
export const typeDefs = `#graphql
  type Query {
    entity(id: ID!): Entity
    entities(filter: EntityFilter): [Entity!]!
    investigation(id: ID!): Investigation
  }
  
  type Mutation {
    createEntity(input: CreateEntityInput!): Entity!
    updateEntity(id: ID!, input: UpdateEntityInput!): Entity!
    deleteEntity(id: ID!): Boolean!
  }
  
  type Entity {
    id: ID!
    kind: EntityKind!
    payload: JSON!
    observedAt: DateTime!
    tenantId: ID!
  }
  
  type Investigation {
    id: ID!
    title: String!
    entities: [Entity!]!
    createdAt: DateTime!
  }
`;
```

**Resolvers** (`/services/api/src/graphql/resolvers/index.ts`):
```typescript
export const resolvers = {
  Query: {
    entity: async (_, { id }, context) => {
      const { user, db } = context;
      return db.neo4j.getEntity(id, user.tenantId);
    },
    
    entities: async (_, { filter }, context) => {
      const { user, db } = context;
      return db.neo4j.queryEntities(filter, user.tenantId);
    },
  },
  
  Mutation: {
    createEntity: async (_, { input }, context) => {
      const { user, db, auditLog } = context;
      const entity = await db.neo4j.createEntity(input, user);
      await auditLog('entity.created', { entityId: entity.id });
      return entity;
    },
  },
};
```

**Context Setup** (`/services/api/src/graphql/context.ts`):
```typescript
export async function createContext(req: any) {
  return {
    user: req.user,           // Authenticated user from auth middleware
    tenantId: req.tenantId,   // From tenant middleware
    db: {
      neo4j: neo4jClient,
      postgres: postgresPool,
      redis: redisClient,
    },
    auditLog: auditLogger,
    logger: logger,
  };
}
```

### Authorization Pattern (ABAC)
**From `/services/api/src/graphql/abac.ts`**:
```typescript
// Attribute-Based Access Control
export async function authorize(context: any, action: string, resource: any) {
  const { user, tenantId } = context;
  
  // Check base permissions
  if (!user.permissions.includes(action)) {
    return false;
  }
  
  // Check tenant isolation
  if (resource.tenantId !== tenantId) {
    return false;
  }
  
  // Check resource attributes
  if (resource.classification && user.clearance < resource.classification) {
    return false;
  }
  
  return true;
}
```

### Error Response Pattern
```typescript
// Standard error responses
res.status(400).json({
  error: 'descriptive_error_code',
  message: 'Human-readable message',
  details: { /* relevant context */ }
});

// GraphQL errors
throw new GraphQLError('Message', {
  extensions: {
    code: 'CUSTOM_ERROR_CODE',
    details: { /* context */ }
  }
});
```

## 5. TYPE DEFINITION PATTERNS

### Package Types Pattern
**Structure** (`/packages/*/src/types.ts`):
```typescript
// Option 1: Interface-based (more flexible)
export interface EventRecord {
  id: string;
  timestamp: number;
  payload: Record<string, unknown>;
  tags?: string[];
}

export interface BoostContext {
  index: number;
  events: readonly EventRecord[];
  options: Readonly<Record<string, unknown>>;
}

// Option 2: Zod Schema + Type Inference (runtime validation)
export const entitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: z.enum(['PERSON', 'ORG', 'LOCATION']),
  metadata: z.record(z.unknown()).optional(),
});

export type Entity = z.infer<typeof entitySchema>;

// Option 3: Classes for complex types
export class Investigation {
  id: string;
  title: string;
  entities: Entity[];
  relationships: Relationship[];
  
  constructor(data: IInvestigationData) {
    this.id = data.id;
    this.title = data.title;
    // ... initialization
  }
}
```

### Package Index Export Pattern
**From `/packages/common-types/src/index.ts`**:
```typescript
export * from './types.js';
```

**From `/packages/narrative-engine/src/index.ts`**:
```typescript
// Selective exports
export { NarrativeEngine } from './core/engine.js';
export { NarrativeTemplate } from './core/template.js';
export { createNarrative } from './api/create.js';
export type { NarrativeOptions, NarrativeResult } from './core/types.js';
```

### Middleware Type Pattern
```typescript
// Custom typed middleware
export interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    name: string;
    tenantId: string;
    role: string;
    permissions: string[];
  };
  token?: string;
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Middleware logic with typed request
}
```

## 6. PACKAGE DEPENDENCY PATTERNS

### How Packages Depend on Each Other

**Pattern 1: Utility Packages**
```typescript
// Common types (lowest level dependency)
import { Entity, Edge } from '@packages/common-types';

// Packages depend on common-types
import { Entity } from '@packages/common-types';
export class EntityStore {
  validate(entity: Entity) {
    // Use shared types
  }
}
```

**Pattern 2: Service Consuming Multiple Packages**
```typescript
// /services/api/src/app.ts
import { Entity } from '@packages/common-types';
import { entitySchema } from '@packages/common-types';
import { NarrativeEngine } from '@packages/narrative-engine';
import { EventBooster } from '@packages/event-booster';

export async function createApp() {
  const narrative = new NarrativeEngine();
  const booster = new EventBooster();
  
  // Combine package functionality
}
```

**Pattern 3: Package Exports Configuration**
```json
{
  "name": "@intelgraph/entity-service",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./types": {
      "types": "./dist/types.d.ts",
      "import": "./dist/types.js"
    },
    "./adapter": {
      "types": "./dist/adapter.d.ts",
      "import": "./dist/adapter.js"
    }
  }
}
```

### Dependency Hierarchy (Low to High)
1. **Contracts** (`/contracts/`) - Pure type definitions, no dependencies
2. **Common Types** (`/packages/common-types`) - Shared types, minimal deps
3. **Utility Packages** (`/packages/*`) - Feature packages, depend on common-types
4. **Services** (`/services/*`) - Microservices, depend on packages and contracts
5. **Apps** (`/apps/*`) - Full applications, depend on everything

### Workspace Commands
```bash
# From root, run in specific workspace
pnpm --workspace=services/api run build

# Run in all packages
pnpm -r run build

# Install dependencies
pnpm install

# Build with turbo caching
pnpm build
```

## BUILDING THE ESPIONAGE PLATFORM - RECOMMENDATIONS

### 1. Create Your Service Package Structure

```bash
# Create new service following the pattern
mkdir -p services/espionage-intel/src/{db,graphql,middleware,routes,utils}
cd services/espionage-intel
npm init -y
```

### 2. Package.json Template
```json
{
  "name": "@intelgraph/espionage-intel",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "ts-node src/index.ts",
    "start": "node dist/index.js",
    "test": "jest",
    "lint": "eslint \"src/**/*.ts\"",
    "format": "prettier --write \"src/**/*.ts\""
  },
  "dependencies": {
    "express": "^5.1.0",
    "@apollo/server": "^4.0.0",
    "@packages/common-types": "workspace:*",
    "zod": "^4.1.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.3",
    "@types/node": "^24.10.1",
    "typescript": "^5.9.3"
  }
}
```

### 3. Key Architectural Decisions

**Multi-database support**: Follow the pattern in `/services/api/src/db/`
```
- PostgreSQL: Relational data, user data, audit logs
- Redis: Caching, session management, real-time state
- Neo4j: Graph relationships, entity networks, connection analysis
```

**Use Zod for runtime validation**:
```typescript
import { z } from 'zod';

export const createInvestigationInput = z.object({
  title: z.string(),
  objectives: z.array(z.string()),
  targets: z.array(z.string()),
});
```

**Organize by concern, not by layer**:
```
src/
├── db/              # All database logic
├── graphql/         # GraphQL schema + resolvers
├── middleware/      # Express middleware
├── routes/          # REST routes
└── utils/           # Helpers, loggers, etc.
```

**Middleware chain pattern**:
```typescript
app.use(helmet());              // Security
app.use(compression());         // Performance
app.use(authMiddleware);        // Authentication
app.use(tenantMiddleware);      // Tenant isolation
app.use(auditMiddleware);       // Audit logging
app.use(rateLimitMiddleware);   // Rate limiting
```

### 4. Standard Practices

- **Health checks**: `/health`, `/health/detailed` endpoints
- **Metrics**: `/metrics` for Prometheus scraping
- **Logging**: Use structured logging (see `/services/api/src/utils/logger.ts`)
- **Error handling**: Return consistent error shape with error codes
- **Testing**: Jest config, tests alongside source code
- **CORS**: Configure per environment
- **Rate limiting**: Essential for public APIs
- **Audit logging**: Log all sensitive operations

## Key Files to Reference

1. **Service Template**: `/services/authz-gateway/` (small, focused service)
2. **Complex Service**: `/services/api/` (GraphQL, multiple DBs, middleware)
3. **Package Types**: `/packages/common-types/src/types.ts`
4. **API Patterns**: `/services/api/src/app.ts`
5. **Middleware**: `/services/api/src/middleware/auth.ts`
6. **Database**: `/services/api/src/db/postgres.ts`

