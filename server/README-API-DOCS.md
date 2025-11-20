# API Documentation and Observability

This document describes the comprehensive API documentation, validation, observability, and testing infrastructure for the IntelGraph platform.

## Features

### 1. OpenAPI/Swagger Documentation

- **Live Documentation**: Access at `/docs` when the server is running
- **OpenAPI 3.0 Spec**: Generated from Zod schemas
- **Interactive Testing**: Try out API endpoints directly from the docs
- **Build Validation**: Build fails if routes are undocumented

#### Viewing Documentation

```bash
npm run dev
# Open http://localhost:4000/docs
```

#### Generating OpenAPI Spec

```bash
npm run docs:generate
# Outputs: openapi.json
```

#### Validating Documentation

```bash
npm run validate:api-docs
# Fails build if routes are undocumented
```

### 2. Zod Validation on All Boundaries

All API endpoints use Zod schemas for request/response validation:

```typescript
import { z } from 'zod';
import { validate } from './middleware/zod-validation.js';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

router.post('/users', validate({ body: schema }), (req, res) => {
  // req.body is validated and typed
});
```

See `src/openapi/routes/` for examples.

### 3. Authority and License Hooks

Runtime enforcement of license restrictions and authority levels:

```typescript
import {
  requireFeature,
  requireAILicense,
  requireExportLicense,
  requireAuthority,
} from './middleware/authority-hooks.js';

// Require specific feature
router.post('/ai/analyze', requireAILicense(), handleAnalysis);

// Require authority level
router.delete('/admin/users/:id', requireAuthority('admin'), deleteUser);

// Require feature license
router.get('/cases/export', requireExportLicense(), exportCase);
```

**License Configuration**:

- Set `LICENSE_KEY` environment variable
- Stubs provided for development
- Integrates with license validation service in production

### 4. OpenTelemetry Tracing

Distributed tracing with request/trace IDs:

**Environment Variables**:

```bash
JAEGER_ENDPOINT=http://localhost:14268/api/traces
PROMETHEUS_PORT=9464
```

**Features**:

- Automatic instrumentation of HTTP, Express, PostgreSQL, Redis
- Request/Trace ID injection in all responses
- Span creation for custom operations
- Jaeger integration for visualization

**Usage in Code**:

```typescript
import { addSpanAttributes, createChildSpan } from './middleware/tracing.js';

router.post('/analyze', async (req, res) => {
  // Add attributes to current span
  addSpanAttributes(req, { userId: req.user.id });

  // Create child span for DB operation
  const span = createChildSpan(req, 'database.query', { table: 'users' });
  // ... perform operation
  span?.end();
});
```

### 5. Prometheus Metrics

Comprehensive application metrics:

**Endpoints**:

- `/metrics` - Prometheus metrics (text format)
- `/metrics/health` - JSON format metrics

**Available Metrics**:

- HTTP request duration and count
- Database query performance
- AI operation metrics
- Business metrics (cases created, evidence processed, etc.)
- Cache hit/miss ratios
- License restriction and authority denial counters

**Custom Metrics**:

```typescript
import {
  recordAiOperation,
  recordCaseCreated,
} from './middleware/prometheus-metrics.js';

// Record AI operation
recordAiOperation('sentiment', 'gpt-4', 1.2, 'success');

// Record business event
recordCaseCreated('open');
```

### 6. E2E Tests with Ephemeral Databases

Integration tests using Testcontainers for isolated test environments:

**Running Tests**:

```bash
# Run all E2E tests
npm run test:e2e

# Run smoke tests only
npm run test:smoke

# Watch mode
npm run test:e2e:watch
```

**Features**:

- Ephemeral PostgreSQL, Neo4j, and Redis containers
- Golden dataset fixtures for deterministic testing
- Automatic setup and teardown
- Parallel execution support

**Golden Dataset**:

- PostgreSQL: `tests/fixtures/golden/postgres.sql`
- Neo4j: `tests/fixtures/golden/neo4j.json`
- Redis: `tests/fixtures/golden/redis.json`

### 7. Build-time Validation

Build fails if API routes are not documented:

```bash
npm run build
# Runs: tsc && npm run validate:api-docs
```

**Validation Checks**:

- All Express routes have OpenAPI documentation
- OpenAPI spec structure is valid
- Required fields are present
- Proper tagging for organization

## Directory Structure

```
server/
├── src/
│   ├── openapi/
│   │   ├── spec.ts                    # OpenAPI specification generator
│   │   ├── middleware.ts              # Swagger UI and validation
│   │   └── routes/                    # Route schemas
│   │       ├── health.schemas.ts
│   │       ├── ai.schemas.ts
│   │       └── ... (add more)
│   ├── middleware/
│   │   ├── zod-validation.ts          # Request validation
│   │   ├── tracing.ts                 # OpenTelemetry middleware
│   │   ├── prometheus-metrics.ts      # Prometheus metrics
│   │   └── authority-hooks.ts         # License/authority enforcement
│   ├── telemetry/
│   │   └── otel-init.ts               # OpenTelemetry initialization
│   └── app-enhanced.ts                # Enhanced app with all middleware
├── tests/
│   ├── e2e/
│   │   ├── setup.ts                   # Test environment setup
│   │   ├── smoke.test.ts              # Smoke tests
│   │   └── jest.setup.ts              # Jest configuration
│   └── fixtures/
│       └── golden/                    # Golden dataset
│           ├── postgres.sql
│           ├── neo4j.json
│           └── redis.json
├── scripts/
│   ├── validate-api-docs.ts           # Documentation validator
│   └── generate-openapi-spec.ts       # Spec generator
├── jest.e2e.config.cjs                # E2E test configuration
└── README-API-DOCS.md                 # This file
```

## Adding New Routes

1. **Create Zod Schema** in `src/openapi/routes/your-route.schemas.ts`:

```typescript
import { z } from 'zod';
import { registry } from '../spec.js';

export const YourRequestSchema = registry.register(
  'YourRequest',
  z
    .object({
      field: z.string().min(1),
    })
    .openapi({ description: 'Your request' }),
);

registry.registerPath({
  method: 'post',
  path: '/api/your-route',
  tags: ['YourTag'],
  request: {
    body: {
      content: {
        'application/json': { schema: YourRequestSchema },
      },
    },
  },
  responses: {
    200: { description: 'Success' },
  },
});
```

2. **Create Route Handler** in `src/routes/your-route.ts`:

```typescript
import { Router } from 'express';
import { validate } from '../middleware/zod-validation.js';
import { YourRequestSchema } from '../openapi/routes/your-route.schemas.js';

const router = Router();

router.post('/', validate({ body: YourRequestSchema }), async (req, res) => {
  // Handler logic
  res.json({ success: true });
});

export default router;
```

3. **Import Schema** in `src/app-enhanced.ts`:

```typescript
import './openapi/routes/your-route.schemas.js';
```

4. **Validate**:

```bash
npm run validate:api-docs
```

## Monitoring and Observability

### Jaeger (Distributed Tracing)

```bash
# Start Jaeger
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 14268:14268 \
  jaegertracing/all-in-one:latest

# Set environment variable
export JAEGER_ENDPOINT=http://localhost:14268/api/traces

# View traces at http://localhost:16686
```

### Prometheus (Metrics)

```bash
# Configure Prometheus to scrape metrics
# prometheus.yml:
scrape_configs:
  - job_name: 'intelgraph'
    static_configs:
      - targets: ['localhost:4000']
    metrics_path: '/metrics'
```

### Grafana (Visualization)

Import dashboards for:

- HTTP request metrics
- Database performance
- AI operation metrics
- Business KPIs

## Compliance

The authority hooks support compliance modes:

- `standard` - Default mode
- `hipaa` - HIPAA compliance
- `fedramp` - FedRAMP compliance
- `il5` - Impact Level 5 compliance

Set via `LICENSE_CONFIG` or environment variables.

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Validate API Documentation
  run: npm run validate:api-docs

- name: Run E2E Tests
  run: npm run test:e2e

- name: Generate OpenAPI Spec
  run: npm run docs:generate

- name: Upload OpenAPI Spec
  uses: actions/upload-artifact@v3
  with:
    name: openapi-spec
    path: openapi.json
```

## Acceptance Criteria

✅ **OpenAPI at /docs**: Live Swagger UI with interactive testing
✅ **OTEL traces visible**: Request/trace IDs in all responses, Jaeger integration
✅ **E2E green with golden data**: Smoke tests pass with ephemeral databases
✅ **Build validation**: Build fails if routes undocumented
✅ **Zod validation**: All API boundaries validated
✅ **Authority hooks**: License and authority enforcement (stubs)
✅ **Prometheus metrics**: Comprehensive application and business metrics

## Next Steps

1. Add more route schemas for existing endpoints
2. Integrate with actual license validation service
3. Add more E2E test scenarios
4. Set up Grafana dashboards
5. Configure alerting rules in Prometheus
