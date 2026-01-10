import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
process.env.NODE_ENV = 'production';
process.env.CORS_ORIGIN = 'https://example.com';
process.env.DATABASE_URL = 'postgres://user:securepass@db.example.com:5432/db';
process.env.NEO4J_URI = 'bolt://neo4j.example.com:7687';
process.env.NEO4J_USER = 'neo4j';
process.env.NEO4J_PASSWORD = 'secure-neo4j-password-32chars-min';
process.env.JWT_SECRET = 'a'.repeat(40);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(40);
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.RATE_LIMIT_MAX_AUTHENTICATED = '1000';
process.env.AI_RATE_LIMIT_WINDOW_MS = '900000';
process.env.AI_RATE_LIMIT_MAX_REQUESTS = '50';
process.env.REDIS_PASSWORD = 'secure-redis-password-32chars-min';

import express from 'express';
import request from 'supertest';
import { secureSession } from '../secure-session.js';
import { cookieParserMiddleware } from '../../security/http-shield.js';

const NO_NETWORK_LISTEN = process.env.NO_NETWORK_LISTEN === 'true';
const describeIf = NO_NETWORK_LISTEN ? describe.skip : describe;

const buildApp = () => {
  const app = express();
  app.use(cookieParserMiddleware);
  app.use(secureSession);
  app.get('/session-check', (req, res) => {
    res.json({ sessionId: (req as any).sessionId });
  });
  return app;
};

describeIf('secureSession middleware', () => {
  it('sets a secure, httpOnly session cookie', async () => {
    const app = buildApp();
    const response = await request(app).get('/session-check');

    expect(response.status).toBe(200);
    expect(response.body.sessionId).toBeDefined();
    const setCookie = response.headers['set-cookie']?.[0];
    expect(setCookie).toContain('ig.sid=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Strict');
  });

  it('reuses existing signed session cookies', async () => {
    const app = buildApp();
    const first = await request(app).get('/session-check');
    const cookie = first.headers['set-cookie'][0];
    const second = await request(app).get('/session-check').set('Cookie', cookie);

    expect(first.body.sessionId).toBeDefined();
    expect(second.body.sessionId).toBe(first.body.sessionId);
    expect(second.headers['set-cookie']).toBeUndefined();
  });
});
