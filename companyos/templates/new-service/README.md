# CompanyOS Service Template

> **Implements**: D2 - Paved Road Template v2 (With Policy & Observability Hooks Pre-Wired)

This template provides a pre-configured starting point for new CompanyOS services with:

- ✅ OPA authorization integration
- ✅ Metrics and observability hooks
- ✅ Tenant context middleware
- ✅ Health endpoints
- ✅ Structured logging
- ✅ Rate limiting integration
- ✅ Basic tests

## Quick Start

```bash
# Generate a new service
cd companyos
./scripts/generate-service.sh my-new-service

# Navigate to the new service
cd services/my-new-service

# Install dependencies
pnpm install

# Start development
pnpm dev
```

## Directory Structure

```
my-new-service/
├── src/
│   ├── index.ts              # Main entry point
│   ├── config.ts             # Configuration
│   ├── middleware/
│   │   ├── auth.ts           # OPA authorization middleware
│   │   ├── tenant.ts         # Tenant context middleware
│   │   ├── rate-limit.ts     # Rate limiting middleware
│   │   └── metrics.ts        # Metrics middleware
│   ├── routes/
│   │   ├── health.ts         # Health endpoints
│   │   └── example.ts        # Example routes
│   └── utils/
│       └── logger.ts         # Structured logging
├── tests/
│   ├── health.test.ts        # Health endpoint tests
│   └── example.test.ts       # Example tests
├── package.json
├── tsconfig.json
└── Dockerfile
```

## Features

### OPA Authorization

Authorization is pre-wired via the `auth` middleware:

```typescript
import { requirePermission } from './middleware/auth';

router.post('/resource',
  requirePermission('resource:create'),
  async (req, res) => {
    // OPA has already validated permission
    // ...
  }
);
```

### Tenant Context

Tenant context is automatically extracted and validated:

```typescript
import { requireTenant } from './middleware/tenant';

router.get('/data',
  requireTenant(),
  async (req, res) => {
    const { tenantId, tier } = req.tenantContext;
    // ...
  }
);
```

### Metrics

Prometheus metrics are automatically collected:

```typescript
// Automatic HTTP metrics:
// - http_request_duration_seconds
// - http_requests_total

// Custom metrics available:
import { metrics } from './middleware/metrics';
metrics.customCounter.inc({ label: 'value' });
```

### Health Endpoints

Pre-configured health endpoints:

- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /metrics` - Prometheus metrics

### Rate Limiting

Rate limiting integrated with tenant tiers:

```typescript
import { rateLimit } from './middleware/rate-limit';

router.post('/expensive-operation',
  rateLimit('expensive:operation'),
  async (req, res) => {
    // Rate limited based on tenant tier
  }
);
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `OPA_URL` | http://localhost:8181 | OPA service URL |
| `LOG_LEVEL` | info | Log level |
| `METRICS_ENABLED` | true | Enable Prometheus metrics |

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test
pnpm test health.test.ts
```

## Building

```bash
# Build TypeScript
pnpm build

# Build Docker image
docker build -t my-new-service .
```

## Deployment

The service is configured for Kubernetes deployment:

```bash
# Deploy to development
kubectl apply -f k8s/dev/

# Deploy with Helm
helm upgrade --install my-new-service ./helm
```
