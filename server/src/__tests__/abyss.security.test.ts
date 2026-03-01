
import request from 'supertest';
import express from 'express';
import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { abyssRouter } from '../../src/routes/abyss.js';

describe('Abyss Protocol Security', () => {
    let app;
    const MOCK_SECRET_HEADER = 'test-secret-header-value';

    beforeAll(() => {
        process.env.ABYSS_SECURITY_HEADER = MOCK_SECRET_HEADER;
        app = express();
        app.use(express.json());
        app.use('/api/abyss', abyssRouter);
    });

    afterAll(() => {
        delete process.env.ABYSS_SECURITY_HEADER;
    });

    describe('extremeAuth Middleware', () => {
        it('should allow access with correct header', async () => {
            const res = await request(app)
                .get('/api/abyss/state')
                .set('x-abyss-authorization', MOCK_SECRET_HEADER);

            expect(res.status).not.toBe(403);
            expect(res.body).toHaveProperty('protocolId');
        });

        it('should deny access with missing header', async () => {
            const res = await request(app)
                .get('/api/abyss/state');

            expect(res.status).toBe(403);
            expect(res.body).toHaveProperty('message', 'Forbidden: Unimaginable authorization is required.');
        });

        it('should deny access with incorrect header', async () => {
            const res = await request(app)
                .get('/api/abyss/state')
                .set('x-abyss-authorization', 'wrong-value');

            expect(res.status).toBe(403);
        });

        it('should deny access when env var is not set (fail secure)', async () => {
            // Temporarily unset env var
            const originalEnv = process.env.ABYSS_SECURITY_HEADER;
            delete process.env.ABYSS_SECURITY_HEADER;

            const res = await request(app)
                .get('/api/abyss/state')
                .set('x-abyss-authorization', MOCK_SECRET_HEADER);

            expect(res.status).toBe(403);

            // Restore env var
            process.env.ABYSS_SECURITY_HEADER = originalEnv;
        });
    });
});
