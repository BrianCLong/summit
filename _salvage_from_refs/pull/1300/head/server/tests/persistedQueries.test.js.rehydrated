const express = require('express');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const { createPersistedQueriesMiddleware } = require('../src/middleware/persistedQueries.ts');

describe('persisted queries per tenant', () => {
  const tmpDir = path.join(__dirname, 'tmp-pq');
  const tenantA = 'tenantA';
  const query = 'query Test { __typename }';
  const hash = createHash('sha256').update(query.trim()).digest('hex');

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, `${tenantA}.json`), JSON.stringify({ [hash]: query }));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function buildApp() {
    const app = express();
    app.use(express.json());
    const pq = createPersistedQueriesMiddleware({
      manifestDirectory: tmpDir,
      enforceInProduction: true,
    });
    app.use(pq.middleware());
    app.post('/graphql', (_req, res) => res.json({ data: { ok: true } }));
    return app;
  }

  it('allows operation from tenant manifest', async () => {
    const app = buildApp();
    const res = await request(app).post('/graphql').set('x-tenant-id', tenantA).send({ id: hash });
    expect(res.status).toBe(200);
  });

  it('rejects unknown tenant operation id', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/graphql')
      .set('x-tenant-id', 'tenantB')
      .send({ id: hash });
    expect(res.status).toBe(403);
  });
});
