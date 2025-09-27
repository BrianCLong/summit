import request from 'supertest';
import app from '../server/server'; // Assuming your main app is exported from server/server.ts

it('exposes SAML metadata route', async () => {
  const res = await request(app).get('/sso/metadata/dev-org');
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toMatch(/xml/);
});