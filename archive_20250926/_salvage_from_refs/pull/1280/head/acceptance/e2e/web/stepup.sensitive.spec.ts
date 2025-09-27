import { test, expect } from '@playwright/test';

test('Sensitive mutation requires WebAuthn step-up', async ({ request }) => {
  const res = await request.post(process.env.GQL_URL!, {
    data: { query: 'mutation($i:MergeInput!){ mergeEntity(input:$i){ id }}', variables: { i: { id:'G999', attrs:{ name:'Temp' } } } },
    headers: { 'Content-Type':'application/json', Authorization:`Bearer ${process.env.TOKEN}` }
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(JSON.stringify(body)).toContain('Step-up');
});
