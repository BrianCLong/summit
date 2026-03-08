"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const index_1 = require("../fixtures/index");
index_1.test.describe('OSINT P0 journey @osint-p0 @journey', () => {
    (0, index_1.test)('login → search → view results → add to case → export bundle', async ({ page, login, mockOsintFeeds, mockWikipedia, }) => {
        await mockOsintFeeds();
        await mockWikipedia();
        await index_1.test.step('authenticate and open OSINT Studio', async () => {
            await login();
            await page.goto('/osint');
        });
        await index_1.test.step('run deterministic search and open the result drawer', async () => {
            await page.getByTestId('osint-search-input').fill('botnet infrastructure');
            const [searchResponse] = await Promise.all([
                page.waitForResponse((response) => response.url().includes('/graphql') &&
                    response.request().postData()?.includes('OsintSearch') === true),
                page.getByTestId('osint-search-button').click(),
            ]);
            await (0, test_1.expect)(searchResponse.ok()).toBeTruthy();
            const clickTarget = await page.waitForFunction(() => {
                const cy = window.__osintCy;
                if (!cy || cy.nodes().length === 0)
                    return null;
                const node = cy.nodes()[0];
                const rect = cy.container()?.getBoundingClientRect();
                if (!rect)
                    return null;
                const pos = node.renderedPosition();
                return { x: rect.left + pos.x, y: rect.top + pos.y, id: node.id() };
            });
            const { x, y } = (await clickTarget.jsonValue());
            await page.mouse.click(x, y);
            const drawer = page.getByTestId('osint-drawer');
            await (0, test_1.expect)(drawer).toBeVisible();
            await (0, test_1.expect)(drawer.getByText('OSINT Item')).toBeVisible();
        });
        await index_1.test.step('add the selected document to a freshly created case', async () => {
            await page.getByTestId('osint-add-to-case').click();
            const modal = page.getByTestId('add-case-modal');
            await (0, test_1.expect)(modal).toBeVisible();
            await modal.getByTestId('case-action-select').click();
            await page.getByRole('option', { name: 'Create New Case' }).click();
            await modal
                .getByTestId('new-case-name')
                .fill(`OSINT Journey ${new Date().toISOString()}`);
            await modal
                .getByTestId('new-case-summary')
                .fill('Automated coverage of the P0 OSINT workflow.');
            const [addCaseResponse] = await Promise.all([
                page.waitForResponse((response) => response.url().includes('/graphql') &&
                    response.request().postData()?.includes('AddCaseItem') === true),
                modal.getByTestId('create-case-add').click(),
            ]);
            await (0, test_1.expect)(addCaseResponse.ok()).toBeTruthy();
        });
        await index_1.test.step('export the bundle from the drawer', async () => {
            const [exportResponse] = await Promise.all([
                page.waitForResponse((response) => response.url().includes('/graphql') &&
                    response.request().postData()?.includes('exportOsintBundle') === true),
                page.getByTestId('osint-export-button').click(),
            ]);
            const payload = await exportResponse.json();
            (0, test_1.expect)(payload.data.exportOsintBundle.url).toContain('osint-bundle');
            const popup = await page.waitForEvent('popup');
            await popup.waitForLoadState('domcontentloaded');
            await (0, test_1.expect)(popup).toHaveURL(/osint-bundle/);
        });
    });
});
