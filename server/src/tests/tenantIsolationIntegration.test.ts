import request from 'supertest';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express, { Response } from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import { tenantContextMiddleware } from '../middleware/tenantContext.js';

// Mock prom-client BEFORE anything else
jest.mock('prom-client', () => {
    const mockMetric = {
        inc: jest.fn(),
        set: jest.fn(),
        observe: jest.fn(),
        labels: jest.fn().mockReturnThis(),
        startTimer: jest.fn().mockReturnValue(jest.fn())
    };
    const mockRegister = {
        registerMetric: jest.fn(),
        getSingleMetric: jest.fn(),
        clear: jest.fn(),
        metrics: jest.fn().mockReturnValue(''),
        contentType: 'text/plain'
    };
    return {
        register: mockRegister,
        Registry: jest.fn().mockImplementation(() => mockRegister),
        Counter: jest.fn().mockImplementation(() => mockMetric),
        Histogram: jest.fn().mockImplementation(() => mockMetric),
        Gauge: jest.fn().mockImplementation(() => mockMetric),
        Summary: jest.fn().mockImplementation(() => mockMetric),
        collectDefaultMetrics: jest.fn()
    };
});

// Mock the dependencies
jest.mock('../db/postgres.js', () => ({
    getPostgresPool: jest.fn(() => ({
        query: jest.fn<any>().mockResolvedValue({ rows: [] }),
        connect: jest.fn<any>().mockResolvedValue({
            query: jest.fn<any>().mockResolvedValue({ rows: [] }),
            release: jest.fn(),
        }),
    })),
}));

jest.mock('../monitoring/metrics.js', () => ({
    metrics: {
        pbacDecisionsTotal: { inc: jest.fn() }
    },
    register: {
        registerMetric: jest.fn(),
        clear: jest.fn()
    },
    httpRequestDuration: { labels: jest.fn().mockReturnThis(), observe: jest.fn() },
    httpRequestsTotal: { labels: jest.fn().mockReturnThis(), inc: jest.fn() }
}));

jest.mock('../metrics/neo4jMetrics.js', () => ({
    neo4jQueryLatencyMs: { labels: jest.fn().mockReturnThis(), observe: jest.fn() },
    neo4jErrorsTotal: { labels: jest.fn().mockReturnThis(), inc: jest.fn() },
    neo4jConnectionsActive: { set: jest.fn() }
}));

jest.mock('../audit/advanced-audit-system.js', () => ({
    getAuditSystem: jest.fn(() => ({
        recordEvent: jest.fn<any>().mockResolvedValue('test-event-id')
    }))
}));

jest.mock('../services/AuthService.js', () => {
    const mockService = {
        verifyToken: jest.fn(),
        hasPermission: jest.fn().mockReturnValue(true),
        formatUser: jest.fn((u) => u)
    };
    const MockAuthService = jest.fn(() => mockService);
    (MockAuthService as any).getInstance = jest.fn(() => mockService);
    (global as any).mockAuthService = mockService;
    return {
        __esModule: true,
        default: MockAuthService
    };
});

import AuthService from '../services/AuthService.js';
const mockAuthService = (global as any).mockAuthService;

describe('Tenant Isolation Integration', () => {
    let app: express.Application;

    beforeEach(() => {
        jest.clearAllMocks();

        app = express();
        app.use(express.json());

        // Setup a test route that requires auth and tenant context
        app.get('/api/test-tenant-resource',
            ensureAuthenticated,
            tenantContextMiddleware(),
            (req: any, res: Response) => {
                res.json({
                    message: 'Access granted',
                    tenantId: req.tenantContext.tenantId,
                    userId: req.user.id
                });
            }
        );
    });

    it('rejects requests without authentication', async () => {
        const response = await request(app)
            .get('/api/test-tenant-resource')
            .set('x-tenant-id', 'tenant-1');

        expect(response.status).toBe(401);
    });

    it('rejects requests without tenant header', async () => {
        (mockAuthService.verifyToken as any).mockResolvedValue({
            id: 'user-1',
            email: 'user1@tenant1.com',
            tenantId: 'tenant-1'
        });

        const response = await request(app)
            .get('/api/test-tenant-resource')
            .set('Authorization', 'Bearer valid-token');

        // Based on app.ts configuration, tenant context is mandatory for /api
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Tenant context is required');
    });

    it('rejects requests where tenant header does not match token tenantId', async () => {
        (mockAuthService.verifyToken as any).mockResolvedValue({
            id: 'user-1',
            email: 'user1@tenant1.com',
            tenantId: 'tenant-1'
        });

        const response = await request(app)
            .get('/api/test-tenant-resource')
            .set('Authorization', 'Bearer valid-token')
            .set('x-tenant-id', 'tenant-2');

        expect(response.status).toBe(409);
        expect(response.body.error).toContain('tenant_context_error');
        expect(response.body.message).toContain('Tenant identifier mismatch');
    });

    it('allows requests where tenant header matches token tenantId', async () => {
        (mockAuthService.verifyToken as any).mockResolvedValue({
            id: 'user-1',
            email: 'user1@tenant1.com',
            tenantId: 'tenant-1'
        });

        const response = await request(app)
            .get('/api/test-tenant-resource')
            .set('Authorization', 'Bearer valid-token')
            .set('x-tenant-id', 'tenant-1');

        expect(response.status).toBe(200);
        expect(response.body.tenantId).toBe('tenant-1');
    });

    it('ensures strict isolation even for ADMINs (must specify active tenant)', async () => {
        (mockAuthService.verifyToken as any).mockResolvedValue({
            id: 'admin-1',
            email: 'admin@intelgraph.com',
            role: 'ADMIN',
            tenantId: 'system-tenant'
        });

        // Admin trying to access tenant-1 without being assigned to it?
        // In our system, admins might be allowed to skip mismatch IF we explicitly allow it,
        // but the policy (CN-004) says "Strict tenant isolation".

        const response = await request(app)
            .get('/api/test-tenant-resource')
            .set('Authorization', 'Bearer admin-token')
            .set('x-tenant-id', 'tenant-1');

        expect(response.status).toBe(409);
        expect(response.body.message).toContain('Tenant identifier mismatch');
    });
});
