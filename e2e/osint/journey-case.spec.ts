import { expect } from '@playwright/test';
import { test } from '../fixtures/index';

test.describe('OSINT P0 journey @osint-p0 @journey', () => {
  test('login → search → view results → add to case → export bundle', async ({
    page,
    login,
    mockOsintFeeds,
    mockWikipedia,
  }) => {
    await mockOsintFeeds();
    await mockWikipedia();
    await test.step('authenticate and open OSINT Studio', async () => {
      await login();
      await page.goto('/osint');
    });

    await test.step('run deterministic search and open the result drawer', async () => {
      await page.getByTestId('osint-search-input').fill('botnet infrastructure');
      const [searchResponse] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes('/graphql') &&
            response.request().postData()?.includes('OsintSearch') === true,
        ),
        page.getByTestId('osint-search-button').click(),
      ]);

      await expect(searchResponse.ok()).toBeTruthy();

      const clickTarget = await page.waitForFunction(() => {
        const cy = (window as any).__osintCy;
        if (!cy || cy.nodes().length === 0) return null;
        const node = cy.nodes()[0];
        const rect = cy.container()?.getBoundingClientRect();
        if (!rect) return null;
        const pos = node.renderedPosition();
        return { x: rect.left + pos.x, y: rect.top + pos.y, id: node.id() };
      });

      const { x, y } = (await clickTarget.jsonValue()) as {
        x: number;
        y: number;
      };
      await page.mouse.click(x, y);

      const drawer = page.getByTestId('osint-drawer');
      await expect(drawer).toBeVisible();
      await expect(drawer.getByText('OSINT Item')).toBeVisible();
    });

    await test.step('add the selected document to a freshly created case', async () => {
      await page.getByTestId('osint-add-to-case').click();
      const modal = page.getByTestId('add-case-modal');
      await expect(modal).toBeVisible();

      await modal.getByTestId('case-action-select').click();
      await page.getByRole('option', { name: 'Create New Case' }).click();
      await modal
        .getByTestId('new-case-name')
        .fill(`OSINT Journey ${new Date().toISOString()}`);
      await modal
        .getByTestId('new-case-summary')
        .fill('Automated coverage of the P0 OSINT workflow.');

      const [addCaseResponse] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes('/graphql') &&
            response.request().postData()?.includes('AddCaseItem') === true,
        ),
        modal.getByTestId('create-case-add').click(),
      ]);

      await expect(addCaseResponse.ok()).toBeTruthy();
    });

    await test.step('export the bundle from the drawer', async () => {
      const [exportResponse] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes('/graphql') &&
            response.request().postData()?.includes('exportOsintBundle') === true,
        ),
        page.getByTestId('osint-export-button').click(),
      ]);

      const payload = await exportResponse.json();
      expect(payload.data.exportOsintBundle.url).toContain('osint-bundle');

      const popup = await page.waitForEvent('popup');
      await popup.waitForLoadState('domcontentloaded');
      await expect(popup).toHaveURL(/osint-bundle/);
    });
  });
});
