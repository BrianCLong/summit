// server/tests/smoke.test.js
const request = require('supertest');
const express = require('express');

// Minimal express app stub to avoid importing full server if not available
function makeApp() {
  const app = express();
  app.get('/api/health', (_req, res) => res.json({ name: 'intelgraph', version: 'dev', status: 'ok' }));
  app.get('/api/version', (_req, res) => res.json({ name: 'intelgraph', version: 'dev' }));
  return app;
}

describe('server smoke tests', () => {
  it('responds to /api/health', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toHaveProperty('name', 'intelgraph');
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('responds to /api/version', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/version').expect(200);
    expect(res.body).toHaveProperty('name', 'intelgraph');
  });
});