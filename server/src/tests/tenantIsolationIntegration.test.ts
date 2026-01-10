import request from 'supertest';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express, { Response } from 'express';
import { ensureAuthenticated } from '../middleware/auth';
import { tenantContextMiddleware } from '../middleware/tenantContext';

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

const mockAuth = {
    verifyToken: jest.fn<any>(),
    hasPermission: jest.fn().mockReturnValue(true),
};
jest.mock('../services/AuthService.js', () => {
    return jest.fn().mockImplementation(() => mockAuth);
});
import AuthService from '../services/AuthService.js';

describe('Tenant Isolation Integration', () => {
    let app: express.Application;

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock the prototype methods of AuthService
        (AuthService.prototype.verifyToken as any) = jest.fn();
        (AuthService.prototype.hasPermission as any) = jest.fn().mockReturnValue(true);

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
        (AuthService.prototype.verifyToken as any).mockResolvedValue({
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
        (AuthService.prototype.verifyToken as any).mockResolvedValue({
            id: 'user-1',
            email: 'user1@tenant1.com',
            tenantId: 'tenant-1'
        });

        const response = await request(app)
            .get('/api/test-tenant-resource')
            .set('Authorization', 'Bearer valid-token')
            .set('x-tenant-id', 'tenant-2');

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('Tenant ID mismatch');
    });

    it('allows requests where tenant header matches token tenantId', async () => {
        (AuthService.prototype.verifyToken as any).mockResolvedValue({
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
        (AuthService.prototype.verifyToken as any).mockResolvedValue({
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

        expect(response.status).toBe(403);
    });
});
