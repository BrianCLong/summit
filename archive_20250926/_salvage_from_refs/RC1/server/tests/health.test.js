const request = require('supertest');
const { createApp } = require('../src/appFactory');

describe('GET /health', () => {
  it('returns OK with expected shape', async () => {
    const app = createApp({ lightweight: true });
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toHaveProperty('status', 'OK');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('environment');
    expect(res.body).toHaveProperty('version');
  });
});

