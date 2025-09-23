import request from 'supertest';
import nock from 'nock';
import fs from 'fs';
import { createApp } from '../app.js';
import { getRedisClient } from '../db/redis.js';

describe('security and observability', () => {
  let app: any;
  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    process.env.PROV_LEDGER_URL = 'http://ledger.test';
    const redis = getRedisClient();
    await redis.set('pq:introspection', 'query Introspection { __schema { types { name } } }');
    await redis.set('pq:user', 'query GetUser { user(id:"1") { id } }');
    await redis.set('pq:create', 'mutation Add { createUser(input:{email:"e", username:"u"}) { id } }');
    app = await createApp();
  });

  afterAll(() => {
    try { fs.unlinkSync('audit.log'); } catch {}
  });

  const token = Buffer.from(JSON.stringify({ id: 'u1', tenantId: 't1', role: 'admin' })).toString('base64');

  test('introspection disabled', async () => {
    const res = await request(app)
      .post('/graphql')
      .set('authorization', `Bearer ${token}`)
      .set('x-tenant-id', 't1')
      .send({ id: 'introspection' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.text).toMatch(/introspection/i);
  });

  test('non persisted query rejected', async () => {
    const res = await request(app)
      .post('/graphql')
      .set('authorization', `Bearer ${token}`)
      .set('x-tenant-id', 't1')
      .send({ query: '{ user(id:"1"){ id } }' });
    expect(res.status).toBe(400);
  });

  test('cross tenant request denied and metrics updated', async () => {
    await request(app)
      .post('/graphql')
      .set('authorization', `Bearer ${token}`)
      .set('x-tenant-id', 't2')
      .send({ id: 'user' })
      .expect(403);
    const metrics = await request(app).get('/monitoring/metrics');
    expect(metrics.text).toMatch(/authz_denies_total 1/);
  });

  test('mutation emits audit and forwards to ledger', async () => {
    const scope = nock('http://ledger.test').post('/events').reply(200, {});
    const res = await request(app)
      .post('/graphql')
      .set('authorization', `Bearer ${token}`)
      .set('x-tenant-id', 't1')
      .send({ id: 'create' });
    expect(res.status).toBe(200);
    expect(scope.isDone()).toBe(true);
    const log = fs.readFileSync('audit.log', 'utf8');
    expect(log).toMatch(/createUser/);
    const metrics = await request(app).get('/monitoring/metrics');
    expect(metrics.text).toMatch(/persisted_query_hits_total 3/);
    expect(metrics.text).toMatch(/audit_events_total 2/);
  });
});
