
import request from 'supertest';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express, { Response } from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';

// Mock dependencies
jest.mock('../db/postgres.js', () => ({
    getPostgresPool: jest.fn(() => ({
        query: jest.fn<any>().mockResolvedValue({ rows: [] }),
    })),
}));

jest.mock('../monitoring/metrics.js', () => ({
    metrics: { pbacDecisionsTotal: { inc: jest.fn() } },
    httpRequestsTotal: { inc: jest.fn() },
    httpRequestDuration: { startTimer: jest.fn(() => jest.fn()) }
}));

jest.mock('../audit/advanced-audit-system.js', () => ({
    getAuditSystem: jest.fn(() => ({
        recordEvent: jest.fn<any>().mockResolvedValue('test-event-id')
    }))
}));

// Mock AuthService using global strategy for consistent mocking
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

const mockAuthService = (global as any).mockAuthService;

describe('Authentication Bypass Integration', () => {
    let app: express.Application;

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(express.json());

        // Setup protected route using just ensureAuthenticated
        app.get('/api/protected-resource', ensureAuthenticated, (req: any, res: Response) => {
            res.json({ message: 'Access granted', user: req.user });
        });
    });

    it('rejects requests with no Authorization header', async () => {
        const response = await request(app).get('/api/protected-resource');
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('No token provided');
    });

    it('rejects requests with empty Authorization header', async () => {
        const response = await request(app)
            .get('/api/protected-resource')
            .set('Authorization', '');
        expect(response.status).toBe(401);
    });

    it('rejects requests with malformed Authorization header (missing Bearer)', async () => {
        const response = await request(app)
            .get('/api/protected-resource')
            .set('Authorization', 'InvalidFormatToken');
        expect(response.status).toBe(401);
    });

    it('rejects requests with invalid token (verifyToken returns null)', async () => {
        mockAuthService.verifyToken.mockResolvedValue(null);

        const response = await request(app)
            .get('/api/protected-resource')
            .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(403);
        expect(mockAuthService.verifyToken).toHaveBeenCalledWith('invalid-token');
    });

    it('rejects requests when verifyToken throws error', async () => {
        mockAuthService.verifyToken.mockRejectedValue(new Error('Token expired'));

        const response = await request(app)
            .get('/api/protected-resource')
            .set('Authorization', 'Bearer expired-token');

        expect(response.status).toBe(403);
    });

    it('allows access with valid token', async () => {
        const mockUser = { id: 'user-1', roles: ['USER'] };
        mockAuthService.verifyToken.mockResolvedValue(mockUser);

        const response = await request(app)
            .get('/api/protected-resource')
            .set('Authorization', 'Bearer valid-token');

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Access granted');
        expect(response.body.user).toEqual(mockUser);
    });
});
