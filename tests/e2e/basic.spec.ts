import { expect, test } from '@playwright/test';

const base = 'http://localhost:7011';

test('prov-ledger manifest endpoint (real)', async ({ request }) => {
  const m = await (await request.get(`${base}/ledger/export/demo-case`)).json();
  expect(m.manifest).toBeTruthy();
});
