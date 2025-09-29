const request = require('supertest');
const { createApp } = require('../src/appFactory');

describe('workspace routes', () => {
  let app;
  beforeAll(() => {
    app = createApp({ lightweight: true });
  });

  it('creates, lists, and retrieves workspaces', async () => {
    const createRes = await request(app)
      .post('/workspaces')
      .send({ name: 'Test Workspace' })
      .expect(201);
    const id = createRes.body.id;
    expect(id).toBeDefined();

    const listRes = await request(app).get('/workspaces').expect(200);
    expect(listRes.body.some(ws => ws.id === id)).toBe(true);

    const getRes = await request(app).get(`/workspaces/${id}`).expect(200);
    expect(getRes.body.id).toBe(id);
  });
});
