
import { describe, test } from 'node:test';
import assert from 'node:assert';
import { AdminConfigSchema } from '../../config/admin-config.js';
import { ScalingGuardrailsSchema, ScalingConfig } from '../../config/scaling-config.js';

describe('AdminConfig', () => {
    test('should validate correct config', () => {
        const validConfig = {
            PG_WRITE_POOL_SIZE: 40,
            PG_READ_POOL_SIZE: 60,
            LOG_LEVEL: 'info',
            JWT_SECRET: 'a'.repeat(32),
            RATE_LIMIT_MAX_REQUESTS: 100,
            NODE_ENV: 'production'
        };

        const result = AdminConfigSchema.safeParse(validConfig);
        assert.ok(result.success);
    });

    test('should fail on short JWT secret', () => {
         const invalidConfig = {
            PG_WRITE_POOL_SIZE: 40,
            LOG_LEVEL: 'info',
            JWT_SECRET: 'short',
            RATE_LIMIT_MAX_REQUESTS: 100
        };
        const result = AdminConfigSchema.safeParse(invalidConfig);
        assert.strictEqual(result.success, false);
        assert.ok(JSON.stringify(result.error).includes('JWT_SECRET'));
    });
});

describe('ScalingConfig', () => {
    test('should validate current scaling config', () => {
        const result = ScalingGuardrailsSchema.safeParse(ScalingConfig);
        assert.ok(result.success, `Scaling config invalid: ${JSON.stringify(result.error)}`);
    });
});
