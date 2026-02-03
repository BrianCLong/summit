import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { setRateLimitConfig, resetRateLimitConfig } from '../../config/rateLimit.js';
import { resetRateLimitStore } from '../../middleware/rateLimit.js';

// Mock pg and CaseWorkflowService
jest.unstable_mockModule('pg', () => ({
    default: {
        Pool: jest.fn(() => ({
            on: jest.fn(),
            connect: jest.fn(),
            query: jest.fn(),
        })),
    },
    Pool: jest.fn(() => ({
        on: jest.fn(),
        connect: jest.fn(),
        query: jest.fn(),
    })),
}));

jest.unstable_mockModule('../../cases/workflow/index.js', () => ({
    CaseWorkflowService: jest.fn(() => ({
        getTransitions: jest.fn(async () => []),
        transitionCase: jest.fn(async () => ({ success: true })),
    })),
}));

const { createCaseWorkflowRouter } = await import('../case-workflow');

describe('Case Workflow Rate Limiting', () => {
    let app: express.Application;
    const mockPg: any = {};

    beforeEach(() => {
        resetRateLimitStore();
        setRateLimitConfig({
            enabled: true,
            store: 'memory',
            groups: {
                default: { limit: 100, windowMs: 60000 },
                webhookIngest: { limit: 30, windowMs: 60000 },
                governance: { limit: 30, windowMs: 60000 },
                caseWorkflow: { limit: 2, windowMs: 60000 }, // Low limit for testing
            },
        });

        app = express();
        app.use(express.json());
        // Mock user for AuthenticatedRequest
        app.use((req: any, _res, next) => {
            req.user = { id: 'test-user', tenantId: 'test-tenant' };
            next();
        });
        app.use('/api/workflow', createCaseWorkflowRouter(mockPg));
    });

    afterEach(() => {
        resetRateLimitConfig();
    });

    it('should allow requests within the rate limit', async () => {
        const response1 = await request(app).post('/api/workflow/cases/c1/transition').send({ toStage: 'closed' });
        expect(response1.status).toBe(200);

        const response2 = await request(app).post('/api/workflow/cases/c1/transition').send({ toStage: 'closed' });
        expect(response2.status).toBe(200);
    });

    it('should return 429 when rate limit is exceeded', async () => {
        await request(app).post('/api/workflow/cases/c1/transition').send({ toStage: 'closed' });
        await request(app).post('/api/workflow/cases/c1/transition').send({ toStage: 'closed' });

        const response = await request(app).post('/api/workflow/cases/c1/transition').send({ toStage: 'closed' });
        expect(response.status).toBe(429);
        expect(response.body.error).toBe('rate_limit_exceeded');
    });
});
