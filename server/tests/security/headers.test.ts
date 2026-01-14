
import { describe, it } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import request from 'supertest';
import { securityHeaders } from '../../src/middleware/securityHeaders.js';

describe('Security Headers', () => {
  it('should set basic security headers', async () => {
    const app = express();
    app.use(securityHeaders({ enabled: true, enableCsp: false }));
    app.get('/', (req, res) => res.send('ok'));

    const res = await request(app).get('/');

    assert.equal(res.headers['x-frame-options'], 'DENY');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['referrer-policy'], 'no-referrer');
  });

  it('should set CSP headers when enabled', async () => {
    const app = express();
    app.use(securityHeaders({ enabled: true, enableCsp: true }));
    app.get('/', (req, res) => res.send('ok'));

    const res = await request(app).get('/');
    const csp = res.headers['content-security-policy'];

    assert.ok(csp);
    assert.ok(csp.includes("default-src 'self'"));
    assert.ok(csp.includes("upgrade-insecure-requests"));
  });
});
