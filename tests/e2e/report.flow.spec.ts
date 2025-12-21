import { test, expect } from './fixtures/case.fixture';

test('report export blocked without role', async ({ request, caseId }) => {
  const r = await request.get(`http://localhost:7016/disclosure/${caseId}`);
  expect([401,403]).toContain(r.status());
});
