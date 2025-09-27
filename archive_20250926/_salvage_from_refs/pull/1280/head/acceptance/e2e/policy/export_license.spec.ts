import { test, expect } from '@playwright/test';

const q = `query($d:ID!){ exportDataset(id:$d){ ok reason } }`;

test('Restricted-TOS dataset export denied with explain', async () => {
  const res = await fetch(process.env.GQL_URL!, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ operationName:'ExportDataset', query:q, variables:{ d:'D001' } })});
  const body = await res.json();
  expect(body.data.exportDataset.ok).toBe(false);
  expect(body.data.exportDataset.reason).toMatch(/license|Restricted-TOS/i);
});
