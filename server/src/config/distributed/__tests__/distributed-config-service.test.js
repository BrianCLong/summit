"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const distributed_config_service_js_1 = __importDefault(require("../distributed-config-service.js"));
const repository_js_1 = __importDefault(require("../repository.js"));
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('DistributedConfigService', () => {
    const schema = zod_1.z.object({
        endpoint: zod_1.z.string().url(),
        retries: zod_1.z.number().int().min(0),
        features: zod_1.z.object({
            enableCaching: zod_1.z.boolean(),
            enableStreaming: zod_1.z.boolean(),
        }),
        database: zod_1.z.object({
            host: zod_1.z.string(),
            password: zod_1.z.union([
                zod_1.z.string(),
                zod_1.z.object({
                    __secretRef: zod_1.z.object({
                        provider: zod_1.z.string(),
                        key: zod_1.z.string(),
                        path: zod_1.z.string().optional(),
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
    let repository;
    let secretResolver;
    let featureFlagAdapter;
    let service;
    (0, globals_1.beforeEach)(() => {
        repository = new repository_js_1.default(() => new Date('2024-01-01T00:00:00Z'));
        secretResolver = {
            resolve: globals_1.jest.fn(async ({ provider, key }) => `${provider}:${key}:resolved`),
        };
        featureFlagAdapter = {
            updateFlags: globals_1.jest.fn(async () => undefined),
        };
        service = new distributed_config_service_js_1.default(repository, {
            secretResolver: secretResolver,
            featureFlagAdapter: featureFlagAdapter,
            clock: () => new Date('2024-01-01T00:00:00Z'),
        });
        service.registerSchema('service-core', schema);
    });
    (0, globals_1.it)('creates versions with overrides and resolves environment-specific config', async () => {
        await service.createOrUpdate('service-core', {
            config: baseConfig,
            overrides: {
                staging: {
                    endpoint: 'https://staging.example.com',
                    features: { enableStreaming: true, enableCaching: true },
                },
            },
            metadata: { actor: 'alice' },
        });
        const resolved = await service.getConfig('service-core', {
            environment: 'staging',
        });
        (0, globals_1.expect)(resolved.version.metadata.version).toBe(1);
        (0, globals_1.expect)(resolved.effectiveConfig.endpoint).toBe('https://staging.example.com');
        (0, globals_1.expect)(resolved.effectiveConfig.features.enableStreaming).toBe(true);
    });
    (0, globals_1.it)('supports dynamic watchers and audit trail entries', async () => {
        const watcher = globals_1.jest.fn();
        service.registerWatcher('service-core', async ({ version }) => {
            watcher(version.metadata.version);
        });
        await service.createOrUpdate('service-core', {
            config: baseConfig,
            metadata: { actor: 'bob', message: 'initial' },
        });
        (0, globals_1.expect)(watcher).toHaveBeenCalledWith(1);
        const audit = await service.getAuditTrail('service-core');
        (0, globals_1.expect)(audit).toHaveLength(1);
        (0, globals_1.expect)(audit[0]).toMatchObject({ actor: 'bob', message: 'initial' });
    });
    (0, globals_1.it)('resolves secrets through the configured resolver', async () => {
        await service.createOrUpdate('service-core', {
            config: baseConfig,
            metadata: { actor: 'carol' },
        });
        const resolved = await service.getConfig('service-core', {
            environment: 'production',
            resolveSecrets: true,
        });
        (0, globals_1.expect)(secretResolver.resolve).toHaveBeenCalledWith({
            provider: 'vault',
            key: 'database/password',
        });
        (0, globals_1.expect)(resolved.effectiveConfig.database.password).toBe('vault:database/password:resolved');
    });
    (0, globals_1.it)('supports canary releases and deterministic assignment', async () => {
        await service.createOrUpdate('service-core', {
            config: baseConfig,
            canary: {
                environment: 'production',
                trafficPercent: 50,
                config: { features: { enableStreaming: true, enableCaching: true } },
                startAt: new Date('2023-12-31T23:00:00Z'),
            },
            metadata: { actor: 'dan' },
        });
        const included = await service.getConfig('service-core', {
            environment: 'production',
            assignmentValue: 0.25,
        });
        (0, globals_1.expect)(included.effectiveConfig.features.enableStreaming).toBe(true);
        const excluded = await service.getConfig('service-core', {
            environment: 'production',
            assignmentValue: 0.75,
        });
        (0, globals_1.expect)(excluded.effectiveConfig.features.enableStreaming).toBe(false);
    });
    (0, globals_1.it)('selects AB test variants deterministically', async () => {
        await service.createOrUpdate('service-core', {
            config: baseConfig,
            abTest: {
                experimentId: 'streaming-toggle',
                variants: [
                    { name: 'control', weight: 1, config: {} },
                    {
                        name: 'variant',
                        weight: 1,
                        config: { features: { enableStreaming: true, enableCaching: true } },
                    },
                ],
                startAt: new Date('2023-12-31T23:00:00Z'),
            },
            metadata: { actor: 'erin' },
        });
        const control = await service.getConfig('service-core', {
            environment: 'production',
            assignmentValue: 0.1,
        });
        (0, globals_1.expect)(control.effectiveConfig.features.enableStreaming).toBe(false);
        const variant = await service.getConfig('service-core', {
            environment: 'production',
            assignmentValue: 0.7,
        });
        (0, globals_1.expect)(variant.effectiveConfig.features.enableStreaming).toBe(true);
    });
    (0, globals_1.it)('supports rollback and feature flag synchronization', async () => {
        await service.createOrUpdate('service-core', {
            config: baseConfig,
            metadata: { actor: 'frank' },
        });
        await service.createOrUpdate('service-core', {
            config: { ...baseConfig, retries: 5 },
            metadata: { actor: 'frank', message: 'increase retries' },
            featureFlags: { STREAMING_BETA: true },
        });
        (0, globals_1.expect)(featureFlagAdapter.updateFlags).toHaveBeenCalledWith({
            STREAMING_BETA: true,
        });
        const rolledBack = await service.rollback('service-core', 1, 'grace', 'revert retries');
        (0, globals_1.expect)(rolledBack.metadata.version).toBe(3);
        const resolved = await service.getConfig('service-core');
        (0, globals_1.expect)(resolved.effectiveConfig.retries).toBe(3);
    });
    (0, globals_1.it)('detects configuration drift with detailed deltas', async () => {
        await service.createOrUpdate('service-core', {
            config: baseConfig,
            metadata: { actor: 'henry' },
        });
        const drift = await service.detectDrift('service-core', 'production', {
            ...baseConfig,
            retries: 4,
            database: { ...baseConfig.database, host: 'drifted' },
        });
        (0, globals_1.expect)(drift.driftDetected).toBe(true);
        (0, globals_1.expect)(drift.deltas).toEqual(globals_1.expect.arrayContaining([
            globals_1.expect.objectContaining({ path: 'retries' }),
            globals_1.expect.objectContaining({ path: 'database.host' }),
        ]));
    });
});
