import request from 'supertest';
import express from 'express';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Use unstable_mockModule for ESM mocking
jest.unstable_mockModule('../../src/middleware/auth.js', () => ({
  ensureAuthenticated: (req: any, res: any, next: any) => {
      (req as any).user = { sub: 'test-user', tenantId: 'test-tenant' };
      next();
  },
}));
jest.unstable_mockModule('../../src/middleware/sensitive-context.js', () => ({
  sensitiveContextMiddleware: (req: any, res: any, next: any) => next(),
}));
jest.unstable_mockModule('../../src/middleware/high-risk-approval.js', () => ({
  highRiskApprovalMiddleware: (req: any, res: any, next: any) => next(),
}));
jest.unstable_mockModule('../../src/analytics/exports/ExportController.js', () => ({
    exportData: (req: any, res: any) => res.json({ status: 'ok' })
}));

// Dynamic import of the router after mocks
const { default: router } = await import('../../src/routes/exports.js');

const app = express();
app.use(express.json());
app.use(router);

describe('POST /sign-manifest Security', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    test('should fail closed (500) in production if EXPORT_SIGNING_SECRET is missing', async () => {
        process.env.NODE_ENV = 'production';
        delete process.env.EXPORT_SIGNING_SECRET;

        const res = await request(app)
            .post('/sign-manifest')
            .send({ tenant: 't1', filters: {}, timestamp: Date.now() });

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Failed to sign manifest' });
    });

    test('should succeed if EXPORT_SIGNING_SECRET is provided', async () => {
        process.env.NODE_ENV = 'production';
        process.env.EXPORT_SIGNING_SECRET = 'strong-secret';

        const res = await request(app)
            .post('/sign-manifest')
            .send({ tenant: 't1', filters: {}, timestamp: Date.now() });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('signature');
    });

    test('should fallback to dev-secret in non-production (development)', async () => {
        process.env.NODE_ENV = 'development';
        delete process.env.EXPORT_SIGNING_SECRET;

        const res = await request(app)
            .post('/sign-manifest')
            .send({ tenant: 't1', filters: {}, timestamp: Date.now() });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('signature');
    });
});
