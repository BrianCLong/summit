# Configuration Management System

> Centralized, versioned, and audited configuration management for the Summit/IntelGraph platform

## Overview

The Configuration Management System provides a comprehensive solution for managing application configuration across all environments with built-in support for:

- ✅ **Centralized Storage**: Consul (primary) + PostgreSQL (fallback) + In-Memory (cache)
- ✅ **Versioning**: Full version history with rollback capability
- ✅ **Secrets Management**: Automated rotation with graceful migration
- ✅ **Approval Workflows**: Multi-approver support for production changes
- ✅ **Drift Detection**: Continuous monitoring and alerting
- ✅ **A/B Testing & Canary**: Built-in experimentation support
- ✅ **Multi-Environment**: Environment-specific overrides
- ✅ **Audit Trail**: Complete change history with actor tracking

## Quick Links

- 📖 [Architecture](./ARCHITECTURE.md) - System design and component overview
- 🚀 [Implementation Guide](./IMPLEMENTATION_GUIDE.md) - Setup and usage instructions
- 📋 [Migration Guide](./IMPLEMENTATION_GUIDE.md#migration-guide) - Migrate from existing configs
- 🔍 [API Reference](./API_REFERENCE.md) - Detailed API documentation
- 💡 [Examples](./examples/) - Common usage patterns

## Features

### 1. Multi-Backend Storage

**Architecture:**
```
Write: All backends (Consul + PostgreSQL + Cache)
Read: Cache → Consul → PostgreSQL (failover)
```

**Benefits:**
- **Real-time updates** via Consul
- **Persistence** via PostgreSQL
- **Performance** via In-Memory cache
- **Resilience** via automatic failover

### 2. Configuration Versioning

Every configuration change creates a new version with:
- Unique version number
- SHA-256 checksum
- Full audit metadata
- Rollback capability

```typescript
// Create version
const v1 = await configService.createOrUpdate('api/config', {
  config: { timeout: 30000 },
  metadata: { actor: 'alice@summit.com', message: 'Initial config' },
});

// Update (creates v2)
const v2 = await configService.createOrUpdate('api/config', {
  config: { timeout: 60000 },
  metadata: { actor: 'bob@summit.com', message: 'Increase timeout' },
});

// Rollback to v1
await configService.rollback('api/config', 1, 'alice@summit.com');
```

### 3. Secrets Management

**Features:**
- Multi-provider support (AWS, GCP, Azure, Vault)
- Automatic rotation policies
- Graceful migration (old + new valid during grace period)
- Encrypted storage
- Version tracking

```typescript
// Set rotation policy
await secretsManager.setRotationPolicy({
  secretId: 'database/password',
  rotationIntervalDays: 90,
  gracePeriodDays: 7,
  notifyOnRotation: ['security@summit.com'],
  enabled: true,
});

// Secret rotates automatically every 90 days
// Old secret remains valid for 7 days
```

### 4. Approval Workflows

**Workflow States:**
```
PENDING → APPROVED → APPLIED
         ↓
      REJECTED
```

**Features:**
- Multi-approver support
- Environment-based auto-approval
- Rejection with reasons
- Approval tracking

```typescript
// Request approval
const workflow = await approvalManager.createWorkflow(
  'database/config',
  proposedVersion,
  'dev@summit.com',
  { environment: 'production' },
);

// Approve
await approvalManager.approve(workflow.changeId, 'lead@summit.com');
await approvalManager.approve(workflow.changeId, 'cto@summit.com');

// Apply
await approvalManager.markApplied(workflow.changeId);
```

### 5. Drift Detection

Continuous monitoring of configuration drift:

```typescript
const report = await configService.detectDrift(
  'api/config',
  'production',
  actualConfig,
);

if (report.driftDetected) {
  console.warn('Drift detected:', report.deltas);
  // Alert operations team
  // Auto-remediate or request review
}
```

### 6. Environment Overrides

Base configuration with environment-specific overrides:

```typescript
await configService.createOrUpdate('api/config', {
  config: {
    apiUrl: 'https://api.summit.com',
    timeout: 30000,
  },
  overrides: {
    development: {
      apiUrl: 'http://localhost:4000',
    },
    staging: {
      apiUrl: 'https://staging-api.summit.com',
    },
  },
});

// Get dev config
const { effectiveConfig } = await configService.getConfig('api/config', {
  environment: 'development',
});
// apiUrl = 'http://localhost:4000'
```

### 7. A/B Testing & Canary Rollouts

**A/B Testing:**
```typescript
await configService.createOrUpdate('ui/theme', {
  config: { theme: 'light' },
  abTest: {
    experimentId: 'theme-exp-001',
    variants: [
      { name: 'control', weight: 0.5, config: { theme: 'light' } },
      { name: 'dark', weight: 0.5, config: { theme: 'dark' } },
    ],
    startAt: new Date(),
    endAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  },
});
```

**Canary Rollouts:**
```typescript
await configService.createOrUpdate('api/config', {
  config: { timeout: 30000 },
  canary: {
    environment: 'production',
    trafficPercent: 10,  // 10% of traffic
    config: { timeout: 60000 },
    startAt: new Date(),
    guardRailMetrics: ['error_rate', 'latency_p99'],
  },
});
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Application Services                    │
│              (Read configs, watch for updates)           │
└────────┬────────────────────────────────┬───────────────┘
         │                                 │
         ▼                                 ▼
┌────────────────────┐          ┌─────────────────────┐
│  Config Service    │◄─────────┤  Approval Workflow  │
│  (CRUD + Watch)    │          │     Manager         │
└────────┬───────────┘          └─────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────┐
│          Multi-Backend Repository                     │
│  ┌──────────┐  ┌────────────┐  ┌─────────────┐     │
│  │  Consul  │  │ PostgreSQL │  │  In-Memory  │     │
│  │ (Primary)│  │ (Fallback) │  │   (Cache)   │     │
│  └──────────┘  └────────────┘  └─────────────┘     │
└──────────────────────────────────────────────────────┘
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌──────────────────┐
│  Secrets Vault  │  │   Audit Store    │
│ (AWS/GCP/Azure) │  │  (PostgreSQL)    │
└─────────────────┘  └──────────────────┘
```

## Components

### 1. DistributedConfigService
Central service for configuration management.

**Methods:**
- `createOrUpdate()` - Create or update configuration
- `getConfig()` - Retrieve effective configuration
- `rollback()` - Rollback to previous version
- `detectDrift()` - Detect configuration drift
- `registerSchema()` - Register Zod schema for validation
- `registerWatcher()` - Watch for configuration changes

### 2. MultiBackendRepository
Multi-backend storage with automatic failover.

**Backends:**
- **Primary**: Consul (real-time, distributed)
- **Fallback**: PostgreSQL (persistent, reliable)
- **Cache**: In-Memory (fast, local)

**Methods:**
- `saveVersion()` - Save to all backends
- `getLatestVersion()` - Read from cache → primary → fallback
- `getHealthStatus()` - Check backend health
- `failoverToFallback()` - Manual failover

### 3. SecretsManager
Secrets management with automatic rotation.

**Methods:**
- `setRotationPolicy()` - Configure rotation policy
- `rotateSecret()` - Manually rotate secret
- `resolve()` - Resolve secret reference
- `cleanupExpired()` - Clean up expired secrets

### 4. ApprovalWorkflowManager
Change approval workflows.

**Methods:**
- `createWorkflow()` - Create approval request
- `approve()` - Approve change
- `reject()` - Reject change
- `markApplied()` - Mark as applied
- `setApprovalRules()` - Configure approval rules

## Installation

### 1. Prerequisites

```bash
# Required
Node.js ≥ 18
PostgreSQL ≥ 15

# Optional (recommended)
Consul ≥ 1.17
Docker
```

### 2. Install Dependencies

```bash
pnpm add pg consul uuid zod
pnpm add -D @types/pg @types/consul @types/uuid
```

### 3. Start Services

```bash
# Start Consul
docker-compose -f docker-compose.consul.yml up -d consul

# Initialize database
psql $DATABASE_URL < migrations/config-management.sql
```

### 4. Initialize

```typescript
import { Pool } from 'pg';
import {
  ConsulConfigRepository,
  PostgresConfigRepository,
  InMemoryConfigRepository,
  MultiBackendRepository,
  DistributedConfigService,
  SecretsManager,
  ApprovalWorkflowManager,
} from './server/src/config/distributed';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Initialize repositories
const consulRepo = new ConsulConfigRepository({ host: 'localhost' });
const postgresRepo = new PostgresConfigRepository({ pool });
await postgresRepo.initialize();

const multiRepo = new MultiBackendRepository({
  primary: consulRepo,
  fallback: postgresRepo,
  cache: new InMemoryConfigRepository(),
});

// Initialize services
const configService = new DistributedConfigService(multiRepo);
const secretsManager = new SecretsManager({ pool, resolvers: new Map() });
await secretsManager.initialize();

const approvalManager = new ApprovalWorkflowManager({ pool });
await approvalManager.initialize();
```

## Usage

### Basic Example

```typescript
// 1. Register schema
const schema = z.object({
  host: z.string(),
  port: z.number(),
  password: z.union([
    z.string(),
    z.object({ __secretRef: z.object({ provider: z.string(), key: z.string() }) }),
  ]),
});

configService.registerSchema('database/config', schema);

// 2. Create configuration
await configService.createOrUpdate('database/config', {
  config: {
    host: 'localhost',
    port: 5432,
    password: { __secretRef: { provider: 'aws', key: 'db/password' } },
  },
  overrides: {
    production: { host: 'prod-db.summit.com' },
  },
  metadata: {
    actor: 'admin@summit.com',
    message: 'Initialize database config',
  },
});

// 3. Retrieve configuration
const { effectiveConfig } = await configService.getConfig('database/config', {
  environment: 'production',
  resolveSecrets: true,
});

// 4. Use configuration
const client = new DatabaseClient(effectiveConfig);
```

## Documentation

- **[Architecture](./ARCHITECTURE.md)** - System design and component overview
- **[Implementation Guide](./IMPLEMENTATION_GUIDE.md)** - Setup and detailed usage
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation
- **[Migration Guide](./IMPLEMENTATION_GUIDE.md#migration-guide)** - Migrate from existing configs
- **[Best Practices](./BEST_PRACTICES.md)** - Operational guidelines

## Examples

See [examples/](./examples/) directory for:
- Basic configuration management
- Environment overrides
- Secrets rotation
- Approval workflows
- Drift detection
- A/B testing
- Canary rollouts

## Testing

```bash
# Run all tests
pnpm test

# Run specific test suite
pnpm test config-management

# Run with coverage
pnpm test:coverage
```

## Monitoring

### Health Checks

```typescript
// Check backend health
const health = await multiRepo.getHealthStatus();
console.log('Health:', health);

// Check active primary
const activePrimary = multiRepo.getActivePrimary();
console.log('Active:', activePrimary);
```

### Metrics

Key metrics to monitor:
- `config.changes.total` - Total configuration changes
- `config.drift.detected` - Drift occurrences
- `secrets.rotations.success` - Successful rotations
- `approvals.pending` - Pending approvals
- `backend.health` - Backend health status

### Events

Listen for important events:

```typescript
// Configuration events
configService.on('config:updated', (version) => {
  console.log('Config updated:', version);
});

// Secrets events
secretsManager.on('secret:rotated', ({ secretId, newVersion }) => {
  console.log(`Secret ${secretId} rotated to v${newVersion}`);
});

// Workflow events
approvalManager.on('workflow:approved', (workflow) => {
  console.log('Workflow approved:', workflow.changeId);
});

// Backend events
multiRepo.on('failover', ({ from, to }) => {
  console.warn(`Failover from ${from} to ${to}`);
});
```

## Troubleshooting

### Common Issues

**1. Consul Connection Failed**
```bash
# Check Consul status
curl http://localhost:8500/v1/status/leader

# Restart Consul
docker-compose -f docker-compose.consul.yml restart consul
```

**2. Secret Resolution Failed**
```typescript
// Register secret resolver
secretsManager.resolvers.set('aws', awsSecretResolver);
```

**3. Approval Stuck**
```typescript
// Check workflow
const workflow = await approvalManager.getWorkflow(changeId);
console.log('Status:', workflow.status);
console.log('Approvals:', workflow.approvals.length, '/', workflow.requiredApprovals);
```

See [Troubleshooting Guide](./TROUBLESHOOTING.md) for more details.

## Contributing

1. Read [CONTRIBUTING.md](../../CONTRIBUTING.md)
2. Follow [Code Conventions](../../CLAUDE.md#code-conventions)
3. Add tests for new features
4. Update documentation
5. Submit pull request

## Security

- All secrets encrypted at rest
- TLS 1.3 for all communication
- RBAC for access control
- Complete audit trail
- Automatic secret rotation

## License

MIT License - see [LICENSE](../../LICENSE)

## Support

- **Documentation**: https://docs.summit.com/config-management
- **Issues**: https://github.com/BrianCLong/summit/issues
- **Slack**: #config-management
- **Email**: support@summit.com
