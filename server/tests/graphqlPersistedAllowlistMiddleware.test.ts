import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import {
  createGraphqlPersistedAllowlistMiddleware,
  hashPersistedQuery,
} from '../src/middleware/graphqlPersistedAllowlist.ts';

describe('GraphqlPersistedAllowlistMiddleware', () => {
  const manifestPath = path.join(__dirname, 'tmp-manifest.json');
  const secondaryManifestPath = path.join(
    __dirname,
    'tmp-secondary-manifest.json',
  );
  const query = 'query Test { __typename }';
  const operationId = 'operation-id-123';
  const apqHash = hashPersistedQuery(query);

  beforeAll(() => {
    fs.writeFileSync(manifestPath, JSON.stringify({ [operationId]: query }));
    fs.writeFileSync(
      secondaryManifestPath,
      JSON.stringify({ secondaryOp: 'query Secondary { health }' }),
    );
  });

  afterAll(() => {
    fs.rmSync(manifestPath, { force: true });
    fs.rmSync(secondaryManifestPath, { force: true });
  });

  function buildApp({
    enforceInProduction = true,
    allowDevFallback = false,
  }: {
    enforceInProduction?: boolean;
    allowDevFallback?: boolean;
  }) {
    const app = express();
    app.use(express.json());
    app.use(
      '/graphql',
      createGraphqlPersistedAllowlistMiddleware({
        manifestPaths: [secondaryManifestPath, manifestPath],
        enforceInProduction,
        allowDevFallback,
      }),
      (req, res) => res.json({ ok: true, query: req.body.query }),
    );
    return app;
  }

  it('allows persisted operation by id and injects query', async () => {
    const app = buildApp({ enforceInProduction: true });
    const res = await request(app).post('/graphql').send({ id: operationId });

    expect(res.status).toBe(200);
    expect(res.body.query).toBe(query);
  });

  it('allows APQ hash lookups', async () => {
    const app = buildApp({ enforceInProduction: true });
    const res = await request(app)
      .post('/graphql')
      .send({
        extensions: { persistedQuery: { sha256Hash: apqHash } },
      });

    expect(res.status).toBe(200);
    expect(res.body.query).toBe(query);
  });

  it('rejects unknown queries when enforcement enabled', async () => {
    const app = buildApp({ enforceInProduction: true });
    const res = await request(app)
      .post('/graphql')
      .send({ query: 'query Unknown { health }' });

    expect(res.status).toBe(403);
    expect(res.body.errors?.[0]?.extensions?.code).toBe(
      'PERSISTED_QUERY_REQUIRED',
    );
  });

  it('falls back to allowing raw queries when dev fallback is enabled', async () => {
    const app = buildApp({ enforceInProduction: false, allowDevFallback: true });
    const res = await request(app)
      .post('/graphql')
      .send({ query: 'query DevOnly { hello }' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('supports GET persisted query lookups via query params', async () => {
    const app = buildApp({ enforceInProduction: true });
    const res = await request(app)
      .get('/graphql')
      .query({ id: operationId });

    expect(res.status).toBe(200);
    expect(res.body.query).toBe(query);
  });

  it('merges multiple manifest files', async () => {
    const app = buildApp({ enforceInProduction: true });
    const res = await request(app)
      .get('/graphql')
      .query({ id: 'secondaryOp' });

    expect(res.status).toBe(200);
    expect(res.body.query).toBe('query Secondary { health }');
  });
});
