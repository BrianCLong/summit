import request from 'supertest';
test('similarEntities by text', async () => {
  const q = `{ similarEntities(text:"banking fraud", topK:5){ id score } }`;
  const r = await request(process.env.API_URL)
    .post('/graphql')
    .set('Authorization', 'Bearer test')
    .send({ query: q });
  expect(r.status).toBe(200);
  expect(r.body.data.similarEntities.length).toBeLessThanOrEqual(5);
});
