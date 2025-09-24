
import request from 'supertest';

import { createApp } from '../src/app';
import { costGuard } from '../src/services/cost-guard';

describe('GraphQL cost guard integration', () => {
  let app: any;
  let server: any;

  beforeAll(async () => {
    app = await createApp();
    server = app.listen(0);
  });

  afterAll(async () => {
    await server.close();
  });

  afterEach(() => {
    costGuard.resetTenant('cost-headers');
    costGuard.resetTenant('cost-over');
    costGuard.resetTenant('cost-partial');
  });

  it('attaches cost guard headers and extensions', async () => {
    costGuard.resetTenant('cost-headers');
    costGuard.setBudgetLimits('cost-headers', {
      daily: 5,
      monthly: 5,
      tokenCapacity: 2,
      query_burst: 2,
      refillPerSecond: 1
    });

    const res = await request(server)
      .post('/graphql')
      .set('x-tenant', 'cost-headers')
      .send({ query: '{ __typename }' });

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-query-cost']).toBeDefined();
    expect(res.headers['x-query-budget-remaining']).toBeDefined();
    expect(res.body.data.__typename).toBe('Query');
    expect(res.body.extensions?.costGuard?.estimatedCost).toBeDefined();
  });

  it('returns 429 when tenant budget is exceeded', async () => {
    costGuard.resetTenant('cost-over');
    costGuard.setBudgetLimits('cost-over', {
      daily: 0.0005,
      monthly: 0.0005,
      tokenCapacity: 0.0002,
      query_burst: 0.0002,
      refillPerSecond: 0
    });

    const res = await request(server)
      .post('/graphql')
      .set('x-tenant', 'cost-over')
      .send({ query: '{ __typename }' });

    expect(res.statusCode).toBe(429);
    expect(res.headers['x-query-cost']).toBeDefined();
    expect(res.body.errors?.[0]?.extensions?.code).toBe('COST_GUARD_LIMIT');
    expect(res.body.errors?.[0]?.extensions?.hints).toBeDefined();
  });

  it('marks partial responses with actionable hints', async () => {
    costGuard.resetTenant('cost-partial');
    costGuard.setBudgetLimits('cost-partial', {
      daily: 0.001,
      monthly: 0.001,
      tokenCapacity: 0.0008,
      query_burst: 1,
      refillPerSecond: 0,
      partialAllowancePct: 0.35
    });

    const res = await request(server)
      .post('/graphql')
      .set('x-tenant', 'cost-partial')
      .send({ query: '{ __typename }' });

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-query-partial']).toBe('true');
    expect(res.body.extensions?.costGuard?.partial).toBe(true);
    expect(res.body.errors?.[0]?.extensions?.code).toBe('COST_GUARD_PARTIAL');
    expect(res.body.extensions?.costGuard?.hints?.length).toBeGreaterThan(0);
  });
});
