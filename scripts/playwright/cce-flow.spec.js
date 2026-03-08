"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
// Validates submit -> attest -> retrieve sealed result flow for the enclave console UI.
(0, test_1.test)('enclave console submit→attest→retrieve sealed result', async ({ page, context }) => {
    await context.route('**/api.ComputeEnclave/RunJob', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                jobId: 'ui-job',
                outputHash: 'hashvalue',
                sealedBlob: 'c2VhbGVk',
                attested: true,
                region: 'us-east-1',
                nonce: 'nonce123',
                proofHandle: 'attested:us-east-1:nonce123',
            }),
        });
    });
    await page.goto('file://' + process.cwd() + '/web/public/enclave-console.html');
    await page.fill('#job-payload', 'playwright payload');
    await page.click('#run-job');
    await (0, test_1.expect)(page.locator('#status')).toHaveText(/attested/i);
    await (0, test_1.expect)(page.locator('#proof-area')).toHaveText(/attested:us-east-1/);
    await page.click('#copy-proof');
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    (0, test_1.expect)(clipboard).toContain('attested:us-east-1');
});
