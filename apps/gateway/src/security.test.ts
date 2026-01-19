import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './server';

describe('Security Headers', () => {
  it('should have Content-Security-Policy header', async () => {
    const res = await request(app).get('/healthz');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });
});
