# Distributed Configuration Management Service

## Overview

The distributed configuration management service introduces a production-ready control plane for managing runtime configuration across Summit services. The service focuses on safety-critical concerns including deterministic rollouts, auditability, rapid recovery, and seamless integrations with existing operational tooling.

## Capabilities

- **Versioned configuration history** with immutable audit records and commit metadata.
- **Environment-specific overrides** that layer on top of baseline configuration values.
- **Secret resolution** via pluggable resolvers (e.g., KeyVault) supporting nested secret references.
- **Dynamic reload** support through watcher callbacks and event emitters that downstream services can subscribe to.
- **Schema validation** using Zod to enforce contract safety before changes are persisted.
- **A/B experimentation and canary rollouts** with deterministic hashing for traffic splitting.
- **Feature flag integration** using the existing MVP feature infrastructure or a custom adapter.
- **Drift detection and applied state tracking** to identify divergence between desired and actual runtime configuration.
- **Rollback workflows** that promote any historical version while preserving metadata and auditing trail entries.

## Architecture

```
┌────────────────────────────┐
│  DistributedConfigService  │
├──────────────┬─────────────┤
│ Schema Guard │ Watchers    │
├──────────────┼─────────────┤
│ Secret Hook  │ FeatureFlag │
├──────────────┴─────────────┤
│ InMemoryConfigRepository   │
└────────────────────────────┘
```

- **DistributedConfigService** orchestrates validation, versioning, rollout logic, and integrations.
- **InMemoryConfigRepository** persists configuration histories, audit logs, and applied state. It is easily replaceable with a database-backed repository when available.
- **Secret and feature-flag adapters** allow integration with KeyVaultService, LaunchDarkly, or existing Summit feature toggles.

## Usage

```ts
import {
  DistributedConfigService,
  InMemoryConfigRepository,
} from '../config/distributed';
import { z } from 'zod';

const schema = z.object({
  endpoint: z.string().url(),
  retries: z.number().int().min(0),
});

const repository = new InMemoryConfigRepository();
const service = new DistributedConfigService(repository, {
  secretResolver: {
    resolve: async ({ provider, key }) => mySecretClient.read(provider, key),
  },
});

service.registerSchema('notification-service', schema);
await service.createOrUpdate('notification-service', {
  config: { endpoint: 'https://api', retries: 3 },
  metadata: { actor: 'deploy-bot', message: 'baseline' },
  overrides: {
    production: { retries: 5 },
  },
  canary: {
    environment: 'production',
    trafficPercent: 10,
    config: { retries: 6 },
    startAt: new Date(),
  },
});

const { effectiveConfig } = await service.getConfig('notification-service', {
  environment: 'production',
  resolveSecrets: true,
  assignmentValue: 0.05,
});
```

## Testing Strategy

New Jest integration tests cover the following scenarios:

- Environment override layering and watcher notifications.
- Secret resolution, AB testing, canary rollouts, and rollback flows.
- Drift detection output and feature flag adapter hand-offs.

Run the suite via `cd server && npm test -- distributed-config-service`.

## Operational Guidance

- Subscribe to the `config:updated` event emitter or register watchers to trigger hot reloads.
- Call `recordApplied` after propagating configuration to capture applied checksums for drift comparison.
- Use `detectDrift` during health checks to flag configuration divergence early.
- Replace the in-memory repository with a persistence layer (e.g., Postgres) by implementing the `RepositoryWriter` interface.
