import request from 'supertest';
import { createServer } from './testHarness'; // Assuming testHarness exists or will be created

describe('health', () => {
  it('is alive', async () => {
    const app = await createServer();
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
