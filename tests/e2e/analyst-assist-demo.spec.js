const { test, expect } = require('@playwright/test');

test.describe('Analyst Assist v0.2 - Demo Walkthrough', () => {
  test('AC: assist → explain → export (blocked)', async ({ page }) => {
    // Navigate to Analyst Assist
    await page.goto('/analyst-assist');

    // 1. ASSIST: Build a query
    await page.fill('[placeholder="Value..."]', 'TOP_SECRET');
    await page.selectOption('select', 'entity.classification');
    await page.selectOption('select >> nth=1', 'equals');

    // 2. EXPLAIN: Preview export policy
    await page.click('text=Preview Export Policy');
    await page.waitForSelector('text=Export Blocked');

    // Verify "Why blocked?" explanation is shown
    const explanation = await page.textContent('.explainability-panel');
    expect(explanation).toContain('Why was this blocked?');
    expect(explanation).toContain('DLP'); // or other policy reason

    // 3. EXPORT: Attempt export (should be blocked)
    await page.click('text=Export Data');
    await page.selectOption('select', 'json');
    await page.click('text=Check Export Policy');

    // Wait for policy result
    await page.waitForSelector('[role="alert"]');

    // Verify blocked status
    const alert = await page.textContent('[role="alert"]');
    expect(alert).toContain('Export Blocked');

    console.log('✅ Blocked flow completed: assist → explain → export (denied)');
  });

  test('AC: assist → explain → export (allowed with step-up)', async ({ page }) => {
    // Navigate to Analyst Assist
    await page.goto('/analyst-assist');

    // 1. ASSIST: Build a query for less sensitive data
    await page.fill('[placeholder="Value..."]', 'UNCLASSIFIED');
    await page.selectOption('select', 'entity.classification');
    await page.selectOption('select >> nth=1', 'equals');

    // 2. EXPLAIN: Preview export policy
    await page.click('text=Preview Export Policy');

    // Check if step-up is required
    const stepUpRequired = await page.isVisible('text=🔐 Authenticate to Export');

    if (stepUpRequired) {
      // Complete step-up authentication (mock)
      await page.click('text=🔐 Authenticate to Export');

      // Wait for step-up modal and complete
      await page.waitForSelector('text=Step-Up Authentication');
      // ... complete WebAuthn flow (mocked in test)

      localStorage.setItem('stepUpToken', 'mock-step-up-token');
    }

    // 3. EXPORT: Check policy again with step-up token
    await page.click('text=Export Data');
    await page.click('text=Check Export Policy');

    // Wait for policy result
    await page.waitForSelector('[role="alert"]');

    // Verify allowed status
    const alert = await page.textContent('[role="alert"]');
    expect(alert).toContain('Export Allowed');

    // Execute export
    const downloadPromise = page.waitForEvent('download');
    await page.click('text=Execute Export');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('.json');

    console.log('✅ Allowed flow completed: assist → explain → export (allowed)');
  });

  test('AC: Policy explanations show evidence and remediation', async ({ page }) => {
    await page.goto('/analyst-assist');

    // Trigger a policy denial
    await page.fill('[placeholder="Value..."]', 'SSN:123-45-6789'); // DLP pattern
    await page.click('text=Preview Export Policy');

    await page.waitForSelector('.explainability-panel');

    // Expand details
    await page.click('text=Show Details');

    // Verify explanation components
    await expect(page.locator('text=Rule ID:')).toBeVisible();
    await expect(page.locator('text=Evidence')).toBeVisible();
    await expect(page.locator('text=How to proceed:')).toBeVisible();

    // Verify AI explanation is present
    await expect(page.locator('.bg-blue-50')).toBeVisible();

    console.log('✅ Policy explanations verified with evidence and remediation');
  });
});

test.describe('Analyst Assist v0.2 - Acceptance Criteria', () => {
  test('✅ Query builder UX implemented', async ({ page }) => {
    await page.goto('/analyst-assist');

    // Verify query builder components
    await expect(page.locator('text=Query Builder')).toBeVisible();
    await expect(page.locator('select >> nth=0')).toBeVisible(); // Field selector
    await expect(page.locator('select >> nth=1')).toBeVisible(); // Operator selector
    await expect(page.locator('[placeholder="Value..."]')).toBeVisible();
    await expect(page.locator('text=Add Condition')).toBeVisible();
    await expect(page.locator('text=Execute Query')).toBeVisible();
  });

  test('✅ "Why blocked?" explanations wired to policy outcomes', async ({ page }) => {
    await page.goto('/analyst-assist');

    await page.fill('[placeholder="Value..."]', 'RESTRICTED');
    await page.click('text=Preview Export Policy');

    await page.waitForSelector('text=Why was this blocked?');
    const explanation = await page.textContent('.explainability-panel');

    expect(explanation).toBeTruthy();
    expect(explanation.length).toBeGreaterThan(50); // Non-trivial explanation
  });

  test('✅ Export request previews policy impact', async ({ page }) => {
    await page.goto('/analyst-assist');
    await page.click('text=Export Data');

    await page.click('text=Check Export Policy');
    await page.waitForSelector('[role="alert"]');

    const policyResult = await page.textContent('[role="alert"]');
    expect(policyResult).toMatch(/Export (Allowed|Blocked)/);
  });

  test('✅ Demo walkthrough: assist → explain → export', async ({ page }) => {
    // This test combines the full flow
    await page.goto('/analyst-assist');

    // Assist
    await page.fill('[placeholder="Value..."]', 'test');
    await page.click('text=Execute Query');

    // Explain
    await page.click('text=Preview Export Policy');
    await page.waitForSelector('.explainability-panel');

    // Export
    await page.click('text=Export Data');
    await page.click('text=Check Export Policy');
    await page.waitForSelector('[role="alert"]');

    console.log('✅ Full demo walkthrough completed');
  });

  test('✅ Blocked/allowed decisions shown per policy', async ({ page }) => {
    await page.goto('/analyst-assist');

    // Test blocked scenario
    await page.fill('[placeholder="Value..."]', 'SECRET');
    await page.click('text=Preview Export Policy');
    await page.waitForSelector('text=🚫');

    // Test allowed scenario
    await page.fill('[placeholder="Value..."]', 'PUBLIC');
    await page.click('text=Preview Export Policy');

    // Should show either allowed or step-up required
    const result = await page.textContent('[role="alert"]');
    expect(result).toMatch(/(✅|⚠️)/);
  });
});
