import request from 'supertest';
import app from '../src/app';
test('provenance route', async () => {
  const res = await request(app).get('/api/provenance/v1.2.3');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});
