import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';

test('GraphQL plan returns evidence-backed response', async () => {
  const { app } = createApp();
  const query = `
    query Plan($input: PlanInput!) {
      plan(input: $input) {
        summary
        backlog
        adr
        policy
        evidenceId
      }
    }
  `;
  const response = await request(app)
    .post('/graphql')
    .set('x-tenant', 'acme-corp')
    .set('x-purpose', 'investigation')
    .send({
      query,
      variables: { input: { objective: 'Ship routing policy' } },
    });
  assert.equal(response.status, 200);
  assert.ok(response.body.data.plan.summary.includes('Ship routing policy'));
  assert.ok(response.body.data.plan.evidenceId);
});

test('REST generate falls back to llama when no budget is available', async () => {
  const { app } = createApp();
  const payload = { objective: 'Need premium help', requiresMultimodal: false };
  const response = await request(app)
    .post('/v1/generate')
    .set('x-tenant', 'acme-corp')
    .set('x-purpose', 'investigation')
    .set('x-allow-paid', 'true')
    .set('x-acceptance-blocked', 'true')
    .send(payload);
  assert.equal(response.status, 200);
  assert.equal(response.body.model.id, 'llama-3-8b-instruct');
});

test('REST generate escalates to paid model when cap allows', async () => {
  const { app } = createApp();
  const payload = {
    objective:
      'High diligence check for critical release readiness and compliance evidence synthesis',
    requiresMultimodal: false,
    caps: { hardUsd: 0.5 },
  };
  const response = await request(app)
    .post('/v1/generate')
    .set('x-tenant', 'acme-corp')
    .set('x-purpose', 'investigation')
    .set('x-allow-paid', 'true')
    .set('x-acceptance-blocked', 'true')
    .set('x-cost-cap-usd', '0.5')
    .send(payload);
  assert.equal(response.status, 200);
  assert.equal(response.body.model.id, 'gpt-4o-mini');
  assert.ok(response.body.cost.usd > 0);
});

test('metrics endpoint exposes Prometheus data after a call', async () => {
  const { app } = createApp();
  await request(app)
    .post('/v1/plan')
    .set('x-tenant', 'acme-corp')
    .set('x-purpose', 'investigation')
    .send({ objective: 'Observe metrics' });
  const metrics = await request(app)
    .get('/metrics')
    .set('x-tenant', 'acme-corp')
    .set('x-purpose', 'investigation');
  assert.equal(metrics.status, 200);
  assert.ok(metrics.text.includes('ai_call_latency_ms'));
});
