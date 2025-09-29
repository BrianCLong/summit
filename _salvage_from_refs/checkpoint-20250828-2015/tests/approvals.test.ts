import request from 'supertest';
import app from '../server/server'; // Assuming your main app is exported from server/server.ts

it('tracks approvals gauge', async () => {
  const create = await request(app).post('/graphql').send({ query: `mutation { createAccessRequest(roles:["analyst"], justification:"for testing"){ id } }` });
  expect(create.status).toBe(200);
  const metrics = await request(app).get('/metrics');
  expect(metrics.text).toMatch(/access_approvals_pending/);
});