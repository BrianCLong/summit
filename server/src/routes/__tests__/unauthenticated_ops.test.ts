// @ts-nocheck
import { jest, describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import request from 'supertest';
import { closeConnections } from '../../config/database.js';

describe('Unauthenticated Access Reproduction', () => {
    let app;
    let createApp: typeof import('../../app.js').createApp;

    beforeAll(async () => {
        process.env.NODE_ENV = 'test';
        ({ createApp } = await import('../../app.js'));
        app = await createApp();
    });

    afterAll(async () => {
        await closeConnections();
    });

    it('should deny unauthenticated access to /dr/backups', async () => {
        const res = await request(app).get('/dr/backups');
        expect(res.status).toBe(401);
    });

    it('should deny unauthenticated access to /analytics/path', async () => {
        const res = await request(app).get('/analytics/path');
        expect(res.status).toBe(401);
    });
});
