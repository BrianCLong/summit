import request from 'supertest';
import app from '../server/server'; // Assuming your main app is exported from server/server.ts

describe('SCIM Users', () => {
  const token = process.env.TEST_SCIM_TOKEN || 'dev-token';
  const auth = { Authorization: `Bearer ${token}` };

  it('creates, patches, lists and soft-deletes a user', async () => {
    const create = await request(app).post('/scim/v2/Users').set(auth).send({ userName: 'scim@example.com', name: { formatted: 'SCIM User' }, active: true });
    expect(create.status).toBe(201);
    const id = create.body.id;

    const patch = await request(app).patch(`/scim/v2/Users/${id}`).set(auth).send({ Operations: [{ op: 'replace', path: 'active', value: false }] });
    expect(patch.status).toBe(204);

    const list = await request(app).get('/scim/v2/Users?filter=userName%20eq%20%22scim@example.com%22').set(auth);
    expect(list.status).toBe(200);
    expect(list.body.totalResults).toBeGreaterThan(0);

    const del = await request(app).delete(`/scim/v2/Users/${id}`).set(auth);
    expect(del.status).toBe(204);
  });
});