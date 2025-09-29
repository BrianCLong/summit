import request from 'supertest';

it('returns predictions with scores and reasons', async () => {
  const q = `query($input:SuggestLinksInput!){ suggestLinks(input:$input){ suggestions { id sourceId targetId score reasons {label weight} } } }`;
  const res = await request('http://localhost:3001/graphql')
    .post('').send({ query: q, variables: { input: { caseId: 'c1', seedNodeIds: ['n1'], topK: 5, threshold: 0.1 } }});
  expect(res.status).toBe(200);
  const items = res.body.data.suggestLinks.suggestions;
  expect(Array.isArray(items)).toBe(true);
});
