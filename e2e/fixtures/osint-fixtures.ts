import { expect, test as base } from '@playwright/test';

type OsintCase = { id: string; name: string };
type OsintItem = {
  hash: string;
  title: string;
  url: string;
  entities?: { id: string; name: string }[];
  claims?: { text: string; confidence?: number }[];
  license?: { allowExport?: boolean };
};

type OsintMockState = {
  cases: OsintCase[];
  osintItems: OsintItem[];
  generatedReports: string[];
  exports: string[];
};

type OsintFixtures = {
  loginAsAnalyst: () => Promise<void>;
  osintMocks: OsintMockState;
};

function defaultMockState(): OsintMockState {
  return {
    cases: [
      { id: 'case-1', name: 'Watchtower Alpha' },
      { id: 'case-2', name: 'Blue Spear' },
    ],
    osintItems: [
      {
        hash: 'osint-1',
        title: 'Dark Web Forum Dump',
        url: 'https://intelgraph.local/osint/osint-1',
        entities: [
          { id: 'ent-1', name: 'C2 Beacon' },
          { id: 'ent-2', name: 'Malware Family: Frostbite' },
        ],
        claims: [
          { text: 'Operator reused infrastructure across three campaigns', confidence: 0.83 },
          { text: 'Attribution to coastal cluster pending', confidence: 0.52 },
        ],
        license: { allowExport: true },
      },
    ],
    generatedReports: [],
    exports: [],
  };
}

function resolveOperation(body: any): string | undefined {
  if (!body) return undefined;
  if (body.operationName) return body.operationName;
  const query: string = body.query || '';
  const match = query.match(/(query|mutation)\s+(\w+)/);
  return match?.[2];
}

export const test = base.extend<OsintFixtures>({
  loginAsAnalyst: async ({ page }, use) => {
    await use(async () => {
      await page.goto('/login');
      await page.getByLabel(/email/i).fill('analyst@example.com');
      await page.getByLabel(/password/i).fill('SuperSecure!23');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        page.getByRole('button', { name: /sign in/i }).click(),
      ]);
      await expect(page).toHaveURL(/dashboard/);
    });
  },

  osintMocks: [async ({ page }, use) => {
    const state = defaultMockState();

    const graphqlHandler = async (route: any) => {
      const body = route.request().postDataJSON?.();
      const operation = resolveOperation(body);

      switch (operation) {
        case 'OsintSearch': {
          await route.fulfill({
            contentType: 'application/json',
            json: { data: { osintItems: state.osintItems } },
          });
          return;
        }
        case 'GetCases': {
          await route.fulfill({ contentType: 'application/json', json: { data: { cases: state.cases } } });
          return;
        }
        case 'CreateCase': {
          const nextId = `case-${state.cases.length + 1}`;
          const newCase = { id: nextId, name: body?.variables?.name ?? `Case ${nextId}` };
          state.cases.push(newCase);
          await route.fulfill({ contentType: 'application/json', json: { data: { createCase: newCase } } });
          return;
        }
        case 'AddCaseItem': {
          await route.fulfill({
            contentType: 'application/json',
            json: { data: { addCaseItem: { id: `case-item-${Date.now()}` } } },
          });
          return;
        }
        case 'exportOsintBundle': {
          const url = 'http://localhost:3000/uploads/reports/osint-bundle.json';
          state.exports.push(url);
          await route.fulfill({ contentType: 'application/json', json: { data: { exportOsintBundle: { url } } } });
          return;
        }
        default:
          await route.continue();
      }
    };

    await page.route('**/graphql', graphqlHandler);
    await page.route('**/api/reports/generate', async (route) => {
      const url = 'http://localhost:3000/uploads/reports/osint-investigation.html';
      state.generatedReports.push(url);
      await route.fulfill({ json: { success: true, url } });
    });

    await page.route('**/uploads/reports/**', async (route) => {
      const body = `<!doctype html><html><head><title>OSINT Investigation Report</title></head><body><h1>OSINT Investigation Report</h1><section class="findings">Open port 8080 found on target host.</section><section class="evidence">Nmap scan results showing port 8080 open.</section><div class="meta">generated: ${new Date().toISOString()}</div></body></html>`;
      await route.fulfill({ contentType: 'text/html', body });
    });

    await use(state);

    await page.unroute('**/graphql', graphqlHandler);
    await page.unroute('**/api/reports/generate');
    await page.unroute('**/uploads/reports/**');
  }, { scope: 'test' }],
});

export { expect };
