import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { authorize } from '../../middleware/auth.js';
import { policyService } from '../PolicyService.js';

vi.mock('../PolicyService.js');

describe('Authorize Middleware Integration', () => {
    let app;

    beforeEach(() => {
        vi.clearAllMocks();
        app = express();
        app.use(express.json());

        // Mock user injection (normally done by ensureAuthenticated)
        app.use((req, res, next) => {
            req.user = {
                id: 'user-123',
                role: 'ANALYST',
                missionTags: ['mission-x'],
                compartment: { orgId: 'org-y' }
            };
            next();
        });

        // Test route
        app.get(
            '/test/:id',
            authorize('read:data', req => ({ id: req.params.id, type: 'data' })),
            (req, res) => {
                res.status(200).json({ success: true });
            }
        );
    });

    it('should allow access when policyService evaluates to allow', async () => {
        (policyService.evaluate as any).mockResolvedValue({ allow: true });

        const response = await request(app).get('/test/item-1');

        expect(response.status).toBe(200);
        expect(policyService.evaluate).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'read:data',
                resource: { id: 'item-1', type: 'data' },
                principal: expect.objectContaining({
                    id: 'user-123',
                    missionTags: ['mission-x']
                })
            })
        );
    });

    it('should deny access when policyService evaluates to deny', async () => {
        (policyService.evaluate as any).mockResolvedValue({
            allow: false,
            reason: 'Policy violation'
        });

        const response = await request(app).get('/test/item-1');

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Policy violation');
    });

    it('should fail with 401 if user is missing', async () => {
        const unauthApp = express();
        unauthApp.get('/test/:id', authorize('read:data'), (req, res) => res.send('ok'));

        const response = await request(unauthApp).get('/test/item-1');
        expect(response.status).toBe(401);
    });
});
