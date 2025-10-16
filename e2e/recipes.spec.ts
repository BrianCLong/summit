import { test, expect, request } from '@playwright/test';

test('runRecipe dry-run → PLANNED', async () => {
  const api = await request.newContext();
  const mutation = `mutation($name:String!,$inputs:JSON,$meta:SafeMeta!){ runRecipe(name:$name, inputs:$inputs, meta:$meta){ status auditId diff } }`;
  const res = await api.post('http://localhost:4000/graphql', {
    data: {
      query: mutation,
      variables: {
        name: 'rag-qa.yaml',
        inputs: { query: 'hello' },
        meta: { idempotencyKey: 'test-1', dryRun: true, reason: 'e2e' },
      },
    },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body?.data?.runRecipe?.status).toBe('PLANNED');
  expect(body?.data?.runRecipe?.auditId).toBeTruthy();
});
