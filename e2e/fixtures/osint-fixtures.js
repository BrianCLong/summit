"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expect = exports.test = exports.osintFixtures = void 0;
const test_1 = require("@playwright/test");
Object.defineProperty(exports, "expect", { enumerable: true, get: function () { return test_1.expect; } });
exports.osintFixtures = {
    mockWikipedia: async ({ page }, use) => {
        await use(async () => {
            await page.route('https://en.wikipedia.org/w/api.php*', async (route) => {
                const url = new URL(route.request().url());
                const title = url.searchParams.get('titles');
                // Return mock data based on title
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
                }
                else {
                    await route.continue();
                }
            });
        });
    },
    mockOsintFeeds: async ({ page }, use) => {
        await use(async () => {
            // Mock generic RSS/JSON feeds if they are accessed from the frontend
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
        await use(async (data) => {
            const response = await request.post('/api/entities', {
                data: {
                    ...data,
                    verified: false,
                },
            });
            (0, test_1.expect)(response.ok()).toBeTruthy();
            return await response.json();
        });
    },
};
exports.test = test_1.test.extend(exports.osintFixtures);
