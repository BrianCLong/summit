import { test as base } from '@playwright/test';

export const test = base.extend<{ caseId: string }>({
  caseId: async ({ request }, use) => {
    const r = await request.post('http://localhost:7016/graphql', {
      data: { query: 'mutation{ case_open(title:"T", sla:"P2D"){ id } }' },
    });
    const json = await r.json();
    await use(json.data.case_open.id);
  },
});
