import request from 'supertest';
test('similarEntities by text (integration)', async () => {
    const apiUrl = process.env.API_URL || 'http://localhost:4000';
    const q = `{ similarEntities(text:"banking fraud", topK:5){ id score } }`;
    const r = await request(apiUrl).post('/graphql')
        .set('Authorization', 'Bearer test')
        .send({ query: q });
    expect(r.status).toBe(200);
    expect(r.body.data.similarEntities.length).toBeLessThanOrEqual(5);
});
//# sourceMappingURL=similarity.text.int.test.js.map