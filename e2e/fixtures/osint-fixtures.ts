import { test as base, expect } from '@playwright/test';
import { testUsers } from './test-data';

type OsintFixtures = {
  loginAsAnalyst: () => Promise<void>;
  osintMocks: void;
  mockWikipedia: () => Promise<void>;
  mockOsintFeeds: () => Promise<void>;
  createEntity: (data: any) => Promise<any>;
};

export const test = base.extend<OsintFixtures>({
  loginAsAnalyst: async ({ page }, use) => {
    await use(async () => {
      await page.goto('/signin');
      // Handle potential redirects or existing session
      if (page.url().includes('/signin')) {
        await page.getByLabel(/email/i).fill(testUsers.analyst.email);
        await page.getByLabel(/password/i).fill(testUsers.analyst.password);
        await page.getByRole('button', { name: /sign in/i }).click();
        await page.waitForURL('/');
      }
    });
  },

  osintMocks: async ({ page }, use) => {
    // Setup mocks for OSINT
    await page.route('**/graphql', async (route) => {
        const postData = route.request().postData();
        if (postData && postData.includes('OsintSearch')) {
            await route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({
                    data: {
                        osintSearch: {
                            results: [
                                {
                                    id: 'node-1',
                                    type: 'osint-artifact',
                                    properties: {
                                        title: 'Botnet Result',
                                        description: 'Found distinct botnet signature.'
                                    }
                                }
                            ]
                        }
                    }
                })
            });
            return;
        }
        if (postData && postData.includes('AddCaseItem')) {
             await route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({
                    data: {
                        addCaseItem: {
                            success: true
                        }
                    }
                })
            });
            return;
        }
        if (postData && postData.includes('exportOsintBundle')) {
             await route.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({
                    data: {
                        exportOsintBundle: {
                            url: 'https://example.com/osint-bundle.zip'
                        }
                    }
                })
            });
            return;
        }
        await route.continue();
    });
    await use();
  },

  mockWikipedia: async ({ page }, use) => {
    await use(async () => {
      await page.route('https://en.wikipedia.org/w/api.php*', async (route) => {
        const url = new URL(route.request().url());
        const title = url.searchParams.get('titles');

        if (title === 'Cyber_Warfare') {
          await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
              query: {
                pages: {
                  '12345': {
                    pageid: 12345,
                    title: 'Cyber Warfare',
                    fullurl: 'https://en.wikipedia.org/wiki/Cyber_Warfare',
                    extract: 'Cyber warfare is the use of cyber attacks against an enemy state.',
                  },
                },
              },
            }),
          });
        } else {
          await route.continue();
        }
      });
    });
  },

  mockOsintFeeds: async ({ page }, use) => {
    await use(async () => {
      await page.route('**/feed.json', async (route) => {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              { title: 'Threat Alert 1', description: 'Severe vulnerability found.' },
              { title: 'Threat Alert 2', description: 'New malware strain detected.' },
            ],
          }),
        });
      });
    });
  },

  createEntity: async ({ request }, use) => {
    await use(async (data: any) => {
      const response = await request.post('/api/entities', {
        data: {
          ...data,
          verified: false,
        },
      });
      // Allow 4xx for negative tests, but expect it to be handled
      return await response.json().catch(() => ({}));
    });
  },
});

export { expect };
