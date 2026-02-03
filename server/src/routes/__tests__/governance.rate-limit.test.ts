import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { setRateLimitConfig, resetRateLimitConfig } from '../../config/rateLimit.js';
import { resetRateLimitStore } from '../../middleware/rateLimit.js';

// Mock SchemaRegistryService and WorkflowService to avoid loading full dependency tree
jest.unstable_mockModule('../../governance/ontology/SchemaRegistryService', () => ({
    SchemaRegistryService: {
        getInstance: () => ({
            listSchemas: () => [],
        }),
    },
}));

jest.unstable_mockModule('../../governance/ontology/WorkflowService', () => ({
    WorkflowService: {
        getInstance: () => ({}),
    },
}));

jest.unstable_mockModule('../../middleware/auth', () => ({
    ensureAuthenticated: (req: any, _res: any, next: any) => {
        req.user = { id: 'test-user', role: 'admin' };
        next();
    },
}));

const governanceRouter = (await import('../governance')).default;

describe('Governance Rate Limiting', () => {
    let app: express.Application;

    beforeEach(() => {
        resetRateLimitStore();
        setRateLimitConfig({
            enabled: true,
            store: 'memory',
            groups: {
                default: { limit: 100, windowMs: 60000 },
                webhookIngest: { limit: 30, windowMs: 60000 },
                governance: { limit: 2, windowMs: 60000 }, // Low limit for testing
                caseWorkflow: { limit: 60, windowMs: 60000 },
            },
        });

        app = express();
        app.use(express.json());
        app.use('/api/governance', governanceRouter);
    });

    afterEach(() => {
        resetRateLimitConfig();
    });

    it('should allow requests within the rate limit', async () => {
        const response1 = await request(app).get('/api/governance/schemas');
        expect(response1.status).toBe(200);

        const response2 = await request(app).get('/api/governance/schemas');
        expect(response2.status).toBe(200);
    });

    it('should return 429 when rate limit is exceeded', async () => {
        await request(app).get('/api/governance/schemas');
        await request(app).get('/api/governance/schemas');

        const response = await request(app).get('/api/governance/schemas');
        expect(response.status).toBe(429);
        expect(response.body.error).toBe('rate_limit_exceeded');
        expect(response.header).toHaveProperty('x-ratelimit-remaining', '0');
        expect(response.header).toHaveProperty('retry-after');
    });
});
