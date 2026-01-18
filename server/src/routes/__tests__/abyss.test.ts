import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { abyssRouter } from '../abyss.js';

const app = express();
app.use(express.json());
app.use('/api/abyss', abyssRouter);

describe('Abyss Router Security', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.ABYSS_AUTH_TOKEN = 'test-secret-token-123';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should deny access if ABYSS_AUTH_TOKEN is not set', async () => {
    delete process.env.ABYSS_AUTH_TOKEN;
    const res = await request(app)
      .get('/api/abyss/state')
      .set('x-abyss-authorization', 'test-secret-token-123');

    expect(res.status).toBe(403);
  });

  it('should deny access if header is missing', async () => {
    const res = await request(app).get('/api/abyss/state');
    expect(res.status).toBe(403);
  });

  it('should deny access if header is incorrect', async () => {
    const res = await request(app)
      .get('/api/abyss/state')
      .set('x-abyss-authorization', 'wrong-token');
    expect(res.status).toBe(403);
  });

  it('should allow access if header matches ABYSS_AUTH_TOKEN', async () => {
    const res = await request(app)
      .get('/api/abyss/state')
      .set('x-abyss-authorization', 'test-secret-token-123');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('protocolId');
    expect(res.body).toHaveProperty('status');
  });
});
