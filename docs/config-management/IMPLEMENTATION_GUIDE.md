# Configuration Management System - Implementation Guide

**Version:** 1.0.0
**Last Updated:** 2025-11-20

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Usage Examples](#usage-examples)
5. [Migration Guide](#migration-guide)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Start Consul

```bash
# Using Docker Compose
docker-compose -f docker-compose.consul.yml up -d consul

# Verify Consul is running
curl http://localhost:8500/v1/status/leader
```

### 2. Initialize Database

```typescript
import { Pool } from 'pg';
import {
  PostgresConfigRepository,
  SecretsManager,
  ApprovalWorkflowManager,
} from './server/src/config/distributed';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize repositories
const postgresRepo = new PostgresConfigRepository({ pool });
await postgresRepo.initialize();

const secretsManager = new SecretsManager({
  pool,
  resolvers: new Map(),
});
await secretsManager.initialize();

const approvalManager = new ApprovalWorkflowManager({ pool });
await approvalManager.initialize();
```

### 3. Create Multi-Backend Configuration

```typescript
import {
  ConsulConfigRepository,
  PostgresConfigRepository,
  InMemoryConfigRepository,
  MultiBackendRepository,
  DistributedConfigService,
} from './server/src/config/distributed';

// Create backends
const consulRepo = new ConsulConfigRepository({
  host: 'localhost',
  port: 8500,
});

const postgresRepo = new PostgresConfigRepository({ pool });
const cacheRepo = new InMemoryConfigRepository();

// Create multi-backend with failover
const multiBackendRepo = new MultiBackendRepository({
  primary: consulRepo,
  fallback: postgresRepo,
  cache: cacheRepo,
  healthCheckInterval: 30000,
  failoverOnError: true,
});

// Create configuration service
const configService = new DistributedConfigService(multiBackendRepo, {
  secretResolver: await createSecretResolver(),
  featureFlagAdapter: await createFeatureFlagAdapter(),
});
```

---

## Installation

### Prerequisites

- Node.js ≥ 18
- PostgreSQL ≥ 15
- Consul ≥ 1.17 (optional, for distributed config)
- Docker (optional, for easy setup)

### Install Dependencies

```bash
# Install Node dependencies
pnpm install

# Add required packages
pnpm add pg consul uuid zod
pnpm add -D @types/pg @types/consul @types/uuid
```

### Setup Environment Variables

```bash
# .env
NODE_ENV=development

# PostgreSQL
DATABASE_URL=postgresql://summit:devpassword@localhost:5432/summit_dev

# Consul
CONSUL_URL=http://localhost:8500
ENABLE_CONSUL=true

# Secrets
ENCRYPTION_KEY=your-32-byte-encryption-key-as-64-char-hex

# Approval Workflows
ENABLE_APPROVAL_WORKFLOW=true
DEFAULT_APPROVERS=admin@summit.com,ops@summit.com
AUTO_APPROVE_ENVIRONMENTS=development,staging

# Rotation
ROTATION_CHECK_INTERVAL=3600000  # 1 hour
DEFAULT_GRACE_PERIOD_DAYS=7
```

---

## Configuration

### Register Configuration Schema

```typescript
import { z } from 'zod';

const databaseConfigSchema = z.object({
  host: z.string(),
  port: z.number().min(1).max(65535),
  database: z.string(),
  username: z.string(),
  password: z.union([
    z.string(),
    z.object({
      __secretRef: z.object({
        provider: z.string(),
        key: z.string(),
      }),
    }),
  ]),
  ssl: z.boolean().default(false),
  poolSize: z.number().min(1).max(100).default(10),
});

configService.registerSchema('database/postgres', databaseConfigSchema);
```

### Create Configuration

```typescript
const config = {
  host: 'localhost',
  port: 5432,
  database: 'summit_production',
  username: 'summit',
  password: {
    __secretRef: {
      provider: 'aws',
      key: 'database/postgres/password',
    },
  },
  ssl: true,
  poolSize: 20,
};

const version = await configService.createOrUpdate('database/postgres', {
  config,
  overrides: {
    production: {
      host: 'prod-db.summit.com',
      ssl: true,
    },
    staging: {
      host: 'staging-db.summit.com',
    },
  },
  metadata: {
    actor: 'admin@summit.com',
    message: 'Update production database configuration',
    source: 'manual',
  },
});

console.log(`Created version ${version.metadata.version}`);
```

### Retrieve Configuration

```typescript
// Get latest version for production environment
const { effectiveConfig } = await configService.getConfig('database/postgres', {
  environment: 'production',
  resolveSecrets: true,  // Resolve secret references
});

console.log('Database config:', effectiveConfig);
```

---

## Usage Examples

### Example 1: Configuration with Environment Overrides

```typescript
// Base configuration applies to all environments
const baseConfig = {
  apiUrl: 'https://api.summit.com',
  timeout: 30000,
  retries: 3,
  features: {
    enableCaching: true,
    enableAnalytics: true,
  },
};

await configService.createOrUpdate('api/config', {
  config: baseConfig,
  overrides: {
    development: {
      apiUrl: 'http://localhost:4000',
      features: {
        enableAnalytics: false,
      },
    },
    staging: {
      apiUrl: 'https://staging-api.summit.com',
    },
  },
  metadata: {
    actor: 'devops@summit.com',
    message: 'Initialize API configuration',
  },
});

// Get config for development
const { effectiveConfig: devConfig } = await configService.getConfig('api/config', {
  environment: 'development',
});
// apiUrl will be 'http://localhost:4000'
// enableAnalytics will be false
```

### Example 2: Secrets Management with Rotation

```typescript
// Create rotation policy
await secretsManager.setRotationPolicy({
  secretId: 'database/postgres/password',
  rotationIntervalDays: 90,  // Rotate every 90 days
  gracePeriodDays: 7,  // Keep old secret valid for 7 days
  notifyOnRotation: ['security@summit.com', 'ops@summit.com'],
  enabled: true,
});

// Manually rotate a secret
await secretsManager.rotateSecret(
  'database/postgres/password',
  'new-secure-password-12345',
  'admin@summit.com',
);

// Listen for rotation events
secretsManager.on('secret:rotated', ({ secretId, newVersion }) => {
  console.log(`Secret ${secretId} rotated to version ${newVersion}`);
});

secretsManager.on('notify:rotation', ({ secretId, recipients }) => {
  // Send notification emails
  sendEmail(recipients, {
    subject: `Secret ${secretId} has been rotated`,
    body: 'Please update your services to use the new secret version.',
  });
});
```

### Example 3: Approval Workflows

```typescript
// Set approval rules for production changes
await approvalManager.setApprovalRules('database/postgres', {
  approvers: ['lead@summit.com', 'cto@summit.com', 'security@summit.com'],
  requiredApprovals: 2,  // Need 2 approvals
  autoApproveFor: ['development'],  // Auto-approve for dev
  requireReason: true,
});

// Request approval for a change
const proposedVersion = await configService.createOrUpdate('database/postgres', {
  config: newConfig,
  metadata: {
    actor: 'dev@summit.com',
    message: 'Increase connection pool size',
  },
});

const workflow = await approvalManager.createWorkflow(
  'database/postgres',
  proposedVersion,
  'dev@summit.com',
  {
    environment: 'production',
    reason: 'Performance improvement - handling increased load',
  },
);

console.log(`Created workflow ${workflow.changeId} - Status: ${workflow.status}`);

// Approve the change
await approvalManager.approve(
  workflow.changeId,
  'lead@summit.com',
  'Looks good, approved',
);

await approvalManager.approve(
  workflow.changeId,
  'cto@summit.com',
  'Performance improvement approved',
);

// Apply the change
await approvalManager.markApplied(workflow.changeId);
```

### Example 4: Drift Detection

```typescript
// Get current applied configuration
const { effectiveConfig: expectedConfig } = await configService.getConfig(
  'database/postgres',
  { environment: 'production' },
);

// Get actual running configuration (from your application)
const actualConfig = await getCurrentDatabaseConfig();

// Detect drift
const driftReport = await configService.detectDrift(
  'database/postgres',
  'production',
  actualConfig,
);

if (driftReport.driftDetected) {
  console.warn('Configuration drift detected!');
  console.log('Differences:');
  driftReport.deltas.forEach((delta) => {
    console.log(`  ${delta.path}:`);
    console.log(`    Expected: ${delta.expected}`);
    console.log(`    Actual: ${delta.actual}`);
  });
}
```

### Example 5: Rollback

```typescript
// List versions
const versions = await postgresRepo.listVersions('database/postgres');
console.log('Available versions:', versions.map((v) => v.metadata.version));

// Rollback to previous version
const rollbackVersion = await configService.rollback(
  'database/postgres',
  5,  // version number
  'admin@summit.com',
  'Rollback due to performance issues',
);

console.log(`Rolled back to version ${rollbackVersion.metadata.version}`);
```

### Example 6: Canary Rollouts

```typescript
// Create configuration with canary rollout
await configService.createOrUpdate('api/config', {
  config: baseConfig,
  canary: {
    environment: 'production',
    trafficPercent: 10,  // Start with 10% traffic
    config: {
      timeout: 60000,  // Test increased timeout
    },
    startAt: new Date(),
    endAt: new Date(Date.now() + 24 * 60 * 60 * 1000),  // 24 hours
    guardRailMetrics: ['error_rate', 'latency_p99'],
  },
  metadata: {
    actor: 'sre@summit.com',
    message: 'Canary rollout for increased timeout',
  },
});

// 10% of requests will get the canary configuration
const { effectiveConfig } = await configService.getConfig('api/config', {
  environment: 'production',
  requestId: 'user-123',  // Used for consistent canary assignment
});
```

### Example 7: A/B Testing

```typescript
// Create configuration with A/B test
await configService.createOrUpdate('ui/theme', {
  config: { theme: 'light', accentColor: '#007bff' },
  abTest: {
    experimentId: 'theme-experiment-001',
    variants: [
      {
        name: 'control',
        weight: 0.5,
        config: { theme: 'light' },
      },
      {
        name: 'dark-theme',
        weight: 0.3,
        config: { theme: 'dark', accentColor: '#00d4ff' },
      },
      {
        name: 'high-contrast',
        weight: 0.2,
        config: { theme: 'light', accentColor: '#ff0000' },
      },
    ],
    startAt: new Date(),
    endAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),  // 14 days
  },
  metadata: {
    actor: 'product@summit.com',
    message: 'A/B test for theme preferences',
  },
});

// Get user-specific configuration
const { effectiveConfig } = await configService.getConfig('ui/theme', {
  actorId: 'user-456',  // Consistent assignment per user
});
```

---

## Migration Guide

### Migrating from .env Files

**Before:**
```bash
# .env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=summit_dev
DATABASE_USER=summit
DATABASE_PASSWORD=devpassword
```

**After:**
```typescript
// 1. Create configuration
const dbConfig = {
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME,
  username: process.env.DATABASE_USER,
  password: {
    __secretRef: {
      provider: 'aws',
      key: 'database/password',
    },
  },
};

await configService.createOrUpdate('database/postgres', {
  config: dbConfig,
  metadata: {
    actor: 'migration-script',
    message: 'Migrated from .env file',
  },
});

// 2. Update application code
// OLD:
const client = new Pool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
});

// NEW:
const { effectiveConfig } = await configService.getConfig('database/postgres', {
  environment: process.env.NODE_ENV,
  resolveSecrets: true,
});

const client = new Pool({
  host: effectiveConfig.host,
  port: effectiveConfig.port,
  database: effectiveConfig.database,
  user: effectiveConfig.username,
  password: effectiveConfig.password,
});
```

### Migrating from Config Files

```typescript
// migration-script.ts
import fs from 'fs';
import yaml from 'yaml';

// Load existing configs
const configs = {
  'database/postgres': yaml.parse(
    fs.readFileSync('config/database.yml', 'utf8')
  ),
  'cache/redis': yaml.parse(
    fs.readFileSync('config/redis.yml', 'utf8')
  ),
  'api/settings': yaml.parse(
    fs.readFileSync('config/api.yml', 'utf8')
  ),
};

// Migrate each config
for (const [configId, config] of Object.entries(configs)) {
  await configService.createOrUpdate(configId, {
    config: config.default,
    overrides: {
      development: config.development,
      staging: config.staging,
      production: config.production,
    },
    metadata: {
      actor: 'migration-script',
      message: `Migrated from config/${configId}.yml`,
      source: 'migration',
    },
  });

  console.log(`✓ Migrated ${configId}`);
}
```

---

## Best Practices

### 1. Configuration Organization

**Good:**
```
configs/
├── database/
│   ├── postgres
│   ├── neo4j
│   └── redis
├── api/
│   ├── settings
│   └── rate-limits
├── security/
│   ├── jwt
│   └── cors
└── features/
    ├── ai-features
    └── analytics
```

**Bad:**
```
configs/
├── config1
├── config2
├── temp-config
└── old-config-backup
```

### 2. Use Schemas for Validation

Always register a schema for your configuration:

```typescript
const apiConfigSchema = z.object({
  baseUrl: z.string().url(),
  timeout: z.number().min(1000).max(300000),
  retries: z.number().min(0).max(5),
  apiKey: z.union([
    z.string().min(32),
    z.object({
      __secretRef: z.object({
        provider: z.enum(['aws', 'gcp', 'azure']),
        key: z.string(),
      }),
    }),
  ]),
});

configService.registerSchema('api/settings', apiConfigSchema);
```

### 3. Secret References

Never store secrets directly in configuration:

**Bad:**
```typescript
const config = {
  apiKey: 'sk-1234567890abcdef',  // ❌ Hardcoded secret
};
```

**Good:**
```typescript
const config = {
  apiKey: {
    __secretRef: {
      provider: 'aws',
      key: 'api/openai/key',
    },
  },  // ✅ Secret reference
};
```

### 4. Rotation Policies

Set appropriate rotation intervals based on sensitivity:

```typescript
// High sensitivity - rotate frequently
await secretsManager.setRotationPolicy({
  secretId: 'database/admin/password',
  rotationIntervalDays: 30,
  gracePeriodDays: 3,
  enabled: true,
});

// Medium sensitivity
await secretsManager.setRotationPolicy({
  secretId: 'api/integration/key',
  rotationIntervalDays: 90,
  gracePeriodDays: 7,
  enabled: true,
});

// Low sensitivity
await secretsManager.setRotationPolicy({
  secretId: 'monitoring/api/token',
  rotationIntervalDays: 180,
  gracePeriodDays: 14,
  enabled: true,
});
```

### 5. Audit Trail

Always provide meaningful commit messages:

```typescript
// Good
await configService.createOrUpdate('api/settings', {
  config,
  metadata: {
    actor: 'alice@summit.com',
    message: 'Increase timeout from 30s to 60s to handle large file uploads',
    source: 'jira-ticket-1234',
  },
});

// Bad
await configService.createOrUpdate('api/settings', {
  config,
  metadata: {
    actor: 'alice@summit.com',
    message: 'update',  // ❌ Not descriptive
  },
});
```

### 6. Environment Strategy

Use a consistent environment hierarchy:

```
development → staging → qa → production
```

Auto-approve for development, require approvals for production:

```typescript
await approvalManager.setApprovalRules(configId, {
  approvers: ['lead@summit.com', 'cto@summit.com'],
  requiredApprovals: 2,
  autoApproveFor: ['development', 'staging'],
});
```

---

## Troubleshooting

### Issue: Consul Connection Failed

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:8500
```

**Solution:**
```bash
# Check if Consul is running
curl http://localhost:8500/v1/status/leader

# Start Consul
docker-compose -f docker-compose.consul.yml up -d consul

# Check logs
docker logs summit-consul
```

### Issue: Secret Resolution Failed

**Symptoms:**
```
Error: No resolver configured for provider: aws
```

**Solution:**
```typescript
import { SecretsManager } from './server/src/config/distributed';

// Register AWS secret resolver
const awsResolver = {
  async resolve(ref: SecretReference): Promise<string> {
    const client = new AWS.SecretsManager({ region: 'us-east-1' });
    const result = await client.getSecretValue({ SecretId: ref.key }).promise();
    return result.SecretString;
  },
};

const secretsManager = new SecretsManager({
  pool,
  resolvers: new Map([['aws', awsResolver]]),
});
```

### Issue: Approval Workflow Stuck

**Symptoms:**
```
Workflow is pending but no one can approve it
```

**Solution:**
```typescript
// Check workflow status
const workflow = await approvalManager.getWorkflow(changeId);
console.log('Approvers:', workflow.approvers);
console.log('Approvals:', workflow.approvals);
console.log('Required:', workflow.requiredApprovals);

// If needed, update approval rules
await approvalManager.setApprovalRules(configId, {
  approvers: ['alice@summit.com', 'bob@summit.com'],
  requiredApprovals: 1,
});
```

### Issue: Configuration Drift

**Symptoms:**
```
Services are using different configuration than expected
```

**Solution:**
```typescript
// Run drift detection
const report = await configService.detectDrift(
  configId,
  'production',
  actualConfig,
);

if (report.driftDetected) {
  // Option 1: Update configuration to match reality
  await configService.createOrUpdate(configId, {
    config: actualConfig,
    metadata: {
      actor: 'ops@summit.com',
      message: 'Sync configuration with running state',
    },
  });

  // Option 2: Force services to reload configuration
  await notifyServicesReload(configId);
}
```

---

## Next Steps

1. **Read the [Architecture Document](./ARCHITECTURE.md)** for deep dive into design
2. **Review [Best Practices Guide](./BEST_PRACTICES.md)** for operational guidelines
3. **Check [API Reference](./API_REFERENCE.md)** for detailed API documentation
4. **See [Examples](./examples/)** for more usage patterns

## Support

- **Documentation**: https://docs.summit.com/config-management
- **Issues**: https://github.com/BrianCLong/summit/issues
- **Slack**: #config-management
