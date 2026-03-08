"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const zk_deconfliction_page_1 = require("../support/pages/zk-deconfliction.page");
test_1.test.describe('ZK Deconfliction Workflows', () => {
    let zkPage;
    test_1.test.beforeEach(async ({ page }) => {
        zkPage = new zk_deconfliction_page_1.ZKDeconflictionPage(page);
        await zkPage.navigate();
    });
    (0, test_1.test)('should verify ZK proofs in run history', async ({ page }) => {
        // This is a placeholder for ZK deconfliction logic which is likely complex.
        // Assuming we can see some badge or status in the UI.
        // Mocking response to include a ZK verified task
        await page.route('/api/maestro/runs', async (route) => {
            const json = {
                run: {
                    id: 'run-zk',
                    createdAt: new Date().toISOString(),
                    status: 'succeeded',
                    userId: 'test-user',
                },
                tasks: [
                    { id: 'task-zk', description: 'Verify Proof', status: 'succeeded' }
                ],
                results: [
                    {
                        task: { id: 'task-zk', description: 'Verify Proof', status: 'succeeded' },
                        artifact: { data: { proofVerified: true, zkSnark: 'mock-proof-string' } }
                    }
                ],
                costSummary: {
                    totalCostUSD: 0.1,
                    totalInputTokens: 500,
                    totalOutputTokens: 100,
                    byModel: {}
                }
            };
            await route.fulfill({ json });
        });
        // Navigate or trigger action that shows this run
        // For now, reuse the agent session flow as it exposes run details
        const agentPage = new zk_deconfliction_page_1.ZKDeconflictionPage(page);
        // Reuse logic or components if possible, but strict separation suggests keeping it distinct.
        // Since ZKPage extends BasePage and we are on the run console page:
        const runInput = page.locator('textarea[placeholder*="Describe what you want Maestro to do"]');
        const runButton = page.getByRole('button', { name: /Run with Maestro/i });
        await runInput.fill('Verify ZK Proof');
        await runButton.click();
        // Check for proof verification in output
        await (0, test_1.expect)(page.locator('.card', { hasText: 'Outputs' })).toContainText('proofVerified');
    });
});
