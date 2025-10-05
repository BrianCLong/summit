import { z } from 'zod';
import DistributedConfigService from '../distributed-config-service';
import InMemoryConfigRepository from '../repository';
import { FeatureFlagAdapter, SecretResolver } from '../types';

describe('DistributedConfigService', () => {
  const schema = z.object({
    endpoint: z.string().url(),
    retries: z.number().int().min(0),
    features: z.object({
      enableCaching: z.boolean(),
      enableStreaming: z.boolean(),
    }),
    database: z.object({
      host: z.string(),
      password: z.union([
        z.string(),
        z.object({
          __secretRef: z.object({
            provider: z.string(),
            key: z.string(),
            path: z.string().optional(),
          }),
        }),
      ]),
    }),
  });

  const baseConfig = {
    endpoint: 'https://api.example.com',
    retries: 3,
    features: {
      enableCaching: true,
      enableStreaming: false,
    },
    database: {
      host: 'config-db',
      password: {
        __secretRef: { provider: 'vault', key: 'database/password' },
      },
    },
  };

  let repository: InMemoryConfigRepository<typeof baseConfig>;
  let secretResolver: { resolve: jest.Mock };
  let featureFlagAdapter: { updateFlags: jest.Mock };
  let service: DistributedConfigService<typeof baseConfig>;

  beforeEach(() => {
    repository = new InMemoryConfigRepository(() => new Date('2024-01-01T00:00:00Z'));
    secretResolver = {
      resolve: jest.fn(async ({ provider, key }) => `${provider}:${key}:resolved`),
    };
    featureFlagAdapter = {
      updateFlags: jest.fn(async () => undefined),
    };

    service = new DistributedConfigService(repository, {
      secretResolver: secretResolver as unknown as SecretResolver,
      featureFlagAdapter: featureFlagAdapter as unknown as FeatureFlagAdapter,
      clock: () => new Date('2024-01-01T00:00:00Z'),
    });
    service.registerSchema('service-core', schema);
  });

  it('creates versions with overrides and resolves environment-specific config', async () => {
    await service.createOrUpdate('service-core', {
      config: baseConfig,
      overrides: {
        staging: {
          endpoint: 'https://staging.example.com',
          features: { enableStreaming: true },
        },
      },
      metadata: { actor: 'alice' },
    });

    const resolved = await service.getConfig('service-core', { environment: 'staging' });
    expect(resolved.version.metadata.version).toBe(1);
    expect(resolved.effectiveConfig.endpoint).toBe('https://staging.example.com');
    expect(resolved.effectiveConfig.features.enableStreaming).toBe(true);
  });

  it('supports dynamic watchers and audit trail entries', async () => {
    const watcher = jest.fn();
    service.registerWatcher('service-core', async ({ version }) => {
      watcher(version.metadata.version);
    });

    await service.createOrUpdate('service-core', {
      config: baseConfig,
      metadata: { actor: 'bob', message: 'initial' },
    });

    expect(watcher).toHaveBeenCalledWith(1);
    const audit = await service.getAuditTrail('service-core');
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ actor: 'bob', message: 'initial' });
  });

  it('resolves secrets through the configured resolver', async () => {
    await service.createOrUpdate('service-core', {
      config: baseConfig,
      metadata: { actor: 'carol' },
    });

    const resolved = await service.getConfig('service-core', {
      environment: 'production',
      resolveSecrets: true,
    });

    expect(secretResolver.resolve).toHaveBeenCalledWith({
      provider: 'vault',
      key: 'database/password',
    });
    expect(resolved.effectiveConfig.database.password).toBe('vault:database/password:resolved');
  });

  it('supports canary releases and deterministic assignment', async () => {
    await service.createOrUpdate('service-core', {
      config: baseConfig,
      canary: {
        environment: 'production',
        trafficPercent: 50,
        config: { features: { enableStreaming: true } },
        startAt: new Date('2023-12-31T23:00:00Z'),
      },
      metadata: { actor: 'dan' },
    });

    const included = await service.getConfig('service-core', {
      environment: 'production',
      assignmentValue: 0.25,
    });
    expect(included.effectiveConfig.features.enableStreaming).toBe(true);

    const excluded = await service.getConfig('service-core', {
      environment: 'production',
      assignmentValue: 0.75,
    });
    expect(excluded.effectiveConfig.features.enableStreaming).toBe(false);
  });

  it('selects AB test variants deterministically', async () => {
    await service.createOrUpdate('service-core', {
      config: baseConfig,
      abTest: {
        experimentId: 'streaming-toggle',
        variants: [
          { name: 'control', weight: 1, config: {} },
          { name: 'variant', weight: 1, config: { features: { enableStreaming: true } } },
        ],
        startAt: new Date('2023-12-31T23:00:00Z'),
      },
      metadata: { actor: 'erin' },
    });

    const control = await service.getConfig('service-core', {
      environment: 'production',
      assignmentValue: 0.1,
    });
    expect(control.effectiveConfig.features.enableStreaming).toBe(false);

    const variant = await service.getConfig('service-core', {
      environment: 'production',
      assignmentValue: 0.7,
    });
    expect(variant.effectiveConfig.features.enableStreaming).toBe(true);
  });

  it('supports rollback and feature flag synchronization', async () => {
    await service.createOrUpdate('service-core', {
      config: baseConfig,
      metadata: { actor: 'frank' },
    });
    await service.createOrUpdate('service-core', {
      config: { ...baseConfig, retries: 5 },
      metadata: { actor: 'frank', message: 'increase retries' },
      featureFlags: { STREAMING_BETA: true },
    });

    expect(featureFlagAdapter.updateFlags).toHaveBeenCalledWith({ STREAMING_BETA: true });

    const rolledBack = await service.rollback('service-core', 1, 'grace', 'revert retries');
    expect(rolledBack.metadata.version).toBe(3);

    const resolved = await service.getConfig('service-core');
    expect(resolved.effectiveConfig.retries).toBe(3);
  });

  it('detects configuration drift with detailed deltas', async () => {
    await service.createOrUpdate('service-core', {
      config: baseConfig,
      metadata: { actor: 'henry' },
    });

    const drift = await service.detectDrift('service-core', 'production', {
      ...baseConfig,
      retries: 4,
      database: { ...baseConfig.database, host: 'drifted' },
    });

    expect(drift.driftDetected).toBe(true);
    expect(drift.deltas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'retries' }),
        expect.objectContaining({ path: 'database.host' }),
      ]),
    );
  });
});
