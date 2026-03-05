import request from 'supertest';
import { createApp } from '../src/app.js';
import { describe, it, expect, beforeAll } from '@jest/globals';

describe('Security Hardening: Root-Mounted Routes', () => {
  let app: any;

  beforeAll(async () => {
    app = await createApp();
  });

  it('should require authentication for /airgap', async () => {
    const response = await request(app).get('/airgap/imports/1');
    expect(response.status).toBe(401);
  });
});
