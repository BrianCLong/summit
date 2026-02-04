import request from 'supertest';
import { test, expect } from '@jest/globals';

const run = process.env.NO_NETWORK_LISTEN !== 'true' && process.env.API_URL;
const testIf = run ? test : test.skip;

testIf('similarEntities by text', async () => {
  const q = `{ similarEntities(text:"banking fraud", topK:5){ id score } }`;
  const r = await request(process.env.API_URL)
    .post('/graphql')
    .set('Authorization', 'Bearer test')
    .send({ query: q });
  expect(r.status).toBe(200);
  expect(r.body.data.similarEntities.length).toBeLessThanOrEqual(5);
});
