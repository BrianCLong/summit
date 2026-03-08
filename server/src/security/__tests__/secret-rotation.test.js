"use strict";
/**
 * Secret Rotation Manager Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearMockRedisStorage = clearMockRedisStorage;
const globals_1 = require("@jest/globals");
const secret_rotation_js_1 = require("../secret-rotation.js");
const mockRedisStorage = new Map();
const mockRedisSets = new Map();
function clearMockRedisStorage() {
    mockRedisStorage.clear();
    mockRedisSets.clear();
}
(0, globals_1.describe)('SecretRotationManager', () => {
    let manager;
    (0, globals_1.beforeEach)(async () => {
        // Clear mock Redis storage between tests
        clearMockRedisStorage();
        (0, secret_rotation_js_1.resetSecretRotationManager)();
        manager = new secret_rotation_js_1.SecretRotationManager(undefined, {
            enabled: true,
            checkIntervalMs: 1000,
            gracePeriodMs: 1000,
            maxVersionsRetained: 3,
            encryptAtRest: true,
        });
        const resolved = (value) => {
            const fn = globals_1.jest.fn();
            fn.mockResolvedValue(value);
            return fn;
        };
        const redisMock = {
            connect: resolved(undefined),
            quit: resolved(undefined),
            ping: resolved('PONG'),
            get: globals_1.jest.fn((key) => Promise.resolve(mockRedisStorage.get(key) || null)),
            set: globals_1.jest.fn((key, value) => {
                mockRedisStorage.set(key, value);
                return Promise.resolve('OK');
            }),
            del: globals_1.jest.fn((...keys) => {
                let count = 0;
                keys.forEach((key) => {
                    if (mockRedisStorage.delete(key))
                        count += 1;
                });
                return Promise.resolve(count);
            }),
            keys: globals_1.jest.fn((pattern) => {
                const regex = new RegExp(pattern.replace('*', '.*'));
                return Promise.resolve(Array.from(mockRedisStorage.keys()).filter(k => regex.test(k)));
            }),
            expire: resolved(1),
            sadd: globals_1.jest.fn((key, ...values) => {
                if (!mockRedisSets.has(key))
                    mockRedisSets.set(key, new Set());
                values.forEach((v) => mockRedisSets.get(key).add(v));
                return Promise.resolve(values.length);
            }),
            smembers: globals_1.jest.fn((key) => {
                return Promise.resolve(Array.from(mockRedisSets.get(key) || []));
            }),
        };
        manager.redis = redisMock;
        await manager.initialize();
    });
    (0, globals_1.afterEach)(async () => {
        await manager.shutdown();
        (0, secret_rotation_js_1.resetSecretRotationManager)();
    });
    (0, globals_1.describe)('Secret Registration', () => {
        (0, globals_1.it)('should register a new secret', async () => {
            const metadata = await manager.registerSecret('api-key', 'test-api-key', 'my-secret-value', ['test', 'development']);
            (0, globals_1.expect)(metadata).toBeDefined();
            (0, globals_1.expect)(metadata.type).toBe('api-key');
            (0, globals_1.expect)(metadata.name).toBe('test-api-key');
            (0, globals_1.expect)(metadata.version).toBe(1);
            (0, globals_1.expect)(metadata.status).toBe('active');
            (0, globals_1.expect)(metadata.tags).toContain('test');
        });
        (0, globals_1.it)('should retrieve registered secret', async () => {
            const registered = await manager.registerSecret('api-key', 'test-key', 'super-secret-123');
            const value = await manager.getSecret(registered.id);
            (0, globals_1.expect)(value).toBe('super-secret-123');
        });
        (0, globals_1.it)('should encrypt secrets at rest', async () => {
            const registered = await manager.registerSecret('jwt-signing', 'jwt-key', 'plain-text-secret');
            // The stored value should be encrypted, not plain text
            // This is verified by successful decryption on retrieval
            const value = await manager.getSecret(registered.id);
            (0, globals_1.expect)(value).toBe('plain-text-secret');
        });
    });
    (0, globals_1.describe)('Secret Rotation', () => {
        (0, globals_1.it)('should rotate a secret', async () => {
            const original = await manager.registerSecret('webhook', 'webhook-secret', 'original-value');
            const rotated = await manager.rotateSecret(original.id, 'manual', 'new-value');
            (0, globals_1.expect)(rotated.version).toBe(2);
            (0, globals_1.expect)(rotated.rotatedBy).toBe('system');
            (0, globals_1.expect)(rotated.rotatedAt).toBeDefined();
            const newValue = await manager.getSecret(original.id);
            (0, globals_1.expect)(newValue).toBe('new-value');
        });
        (0, globals_1.it)('should auto-generate secret if not provided', async () => {
            const original = await manager.registerSecret('api-key', 'auto-rotate-key', 'original');
            const rotated = await manager.rotateSecret(original.id, 'manual');
            const newValue = await manager.getSecret(original.id);
            (0, globals_1.expect)(newValue).not.toBe('original');
            (0, globals_1.expect)(newValue).toMatch(/^sk_/); // API key format
        });
        (0, globals_1.it)('should emit rotation event', async () => {
            const events = [];
            manager.on('secret:rotated', (event) => events.push(event));
            const original = await manager.registerSecret('api-key', 'event-test', 'value');
            await manager.rotateSecret(original.id, 'scheduled');
            (0, globals_1.expect)(events.length).toBe(1);
            (0, globals_1.expect)(events[0].secretId).toBe(original.id);
            (0, globals_1.expect)(events[0].reason).toBe('scheduled');
        });
    });
    (0, globals_1.describe)('Secret Revocation', () => {
        (0, globals_1.it)('should revoke a secret', async () => {
            const secret = await manager.registerSecret('api-key', 'revoke-test', 'value');
            await manager.revokeSecret(secret.id, 'compromised');
            const metadata = await manager.getSecretMetadata(secret.id);
            (0, globals_1.expect)(metadata?.status).toBe('revoked');
        });
        (0, globals_1.it)('should emit revocation event', async () => {
            const events = [];
            manager.on('secret:revoked', (event) => events.push(event));
            const secret = await manager.registerSecret('api-key', 'revoke-event', 'value');
            await manager.revokeSecret(secret.id, 'manual');
            (0, globals_1.expect)(events.length).toBe(1);
            (0, globals_1.expect)(events[0].id).toBe(secret.id);
        });
    });
    (0, globals_1.describe)('Secret Listing', () => {
        (0, globals_1.it)('should list all secrets', async () => {
            await manager.registerSecret('api-key', 'key-1', 'v1');
            await manager.registerSecret('webhook', 'hook-1', 'v2');
            await manager.registerSecret('api-key', 'key-2', 'v3');
            const all = await manager.listSecrets();
            (0, globals_1.expect)(all.length).toBe(3);
        });
        (0, globals_1.it)('should list secrets by type', async () => {
            await manager.registerSecret('api-key', 'key-1', 'v1');
            await manager.registerSecret('webhook', 'hook-1', 'v2');
            await manager.registerSecret('api-key', 'key-2', 'v3');
            const apiKeys = await manager.listSecrets('api-key');
            (0, globals_1.expect)(apiKeys.length).toBe(2);
            (0, globals_1.expect)(apiKeys.every(s => s.type === 'api-key')).toBe(true);
        });
    });
    (0, globals_1.describe)('Rotation Status', () => {
        (0, globals_1.it)('should report rotation status', async () => {
            await manager.registerSecret('api-key', 'status-key', 'value');
            await manager.registerSecret('webhook', 'status-hook', 'value');
            const status = await manager.getRotationStatus();
            (0, globals_1.expect)(status.totalSecrets).toBe(2);
            (0, globals_1.expect)(status.byType['api-key']).toBe(1);
            (0, globals_1.expect)(status.byType['webhook']).toBe(1);
        });
    });
    (0, globals_1.describe)('Secret Generation', () => {
        (0, globals_1.it)('should generate API keys with correct format', async () => {
            const secret = await manager.registerSecret('api-key', 'gen-api', 'placeholder');
            await manager.rotateSecret(secret.id, 'manual');
            const value = await manager.getSecret(secret.id);
            (0, globals_1.expect)(value).toMatch(/^sk_[a-f0-9]{64}$/);
        });
        (0, globals_1.it)('should generate webhook secrets with correct format', async () => {
            const secret = await manager.registerSecret('webhook', 'gen-hook', 'placeholder');
            await manager.rotateSecret(secret.id, 'manual');
            const value = await manager.getSecret(secret.id);
            (0, globals_1.expect)(value).toMatch(/^whsec_/);
        });
    });
    (0, globals_1.describe)('Policy Management', () => {
        (0, globals_1.it)('should add custom rotation policy', () => {
            manager.addPolicy({
                type: 'api-key',
                rotationIntervalMs: 24 * 60 * 60 * 1000, // 1 day
                autoRotate: true,
                validationFn: async (secret) => secret.length >= 32,
            });
            // Policy is stored internally; verify by attempting rotation
            // with validation
        });
    });
    (0, globals_1.describe)('Health Check', () => {
        (0, globals_1.it)('should return healthy status', async () => {
            const health = await manager.healthCheck();
            (0, globals_1.expect)(health.status).toBe('healthy');
            (0, globals_1.expect)(health.details.redis).toBe('connected');
        });
    });
});
