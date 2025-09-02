import { test, expect } from '@playwright/test';

test.describe('Case Workflow E2E', () => {
  test('OSINT node -> Add to Case -> open Case Detail -> export -> download succeeds', async ({
    page,
  }) => {
    // 1. Navigate to OSINT Studio
    await page.goto('http://localhost:3000/osint');
    await expect(page.locator('h2')).toContainText('OSINT Studio');

    // 2. Search for an OSINT item to get a node
    await page.locator('input[label="Search OSINT"]').fill('test');
    await page.locator('button[title="Run OSINT search (GraphQL)"]').click();
    await page.waitForTimeout(2000); // Wait for search results to load and graph to render

    // 3. Click on an OSINT node to open the drawer
    // Assuming there's at least one node after search
    await page.locator('canvas').click({ position: { x: 100, y: 100 } }); // Click on a general area where a node might be
    await page.waitForSelector('h3:has-text("OSINT Item")'); // Wait for the drawer to open

    // 4. Click "Add to Case" button in the drawer
    await page.locator('button:has-text("Add to Case")').click();
    await page.waitForSelector('h2:has-text("Add Item to Case")'); // Wait for the modal to open

    // 5. Create a new case and add the item
    await page.locator('text="Create New Case"').click();
    await page.locator('input[label="New Case Name"]').fill('E2E Test Case ' + Date.now());
    await page
      .locator('textarea[label="New Case Summary"]')
      .fill('This is a test case created by E2E workflow.');
    await page.locator('button:has-text("Create Case and Add")').click();

    // Wait for toast confirmation
    await page.waitForSelector('div[role="alert"]:has-text("Item added to case successfully!")');
    await page.waitForTimeout(1000); // Wait for toast to disappear

    // 6. Get the new case ID from the toast or by querying cases (more robust)
    // For simplicity, we'll navigate to the cases page and find it.
    await page.goto('http://localhost:3000/cases'); // Assuming a /cases route lists all cases
    await expect(page.locator('h2')).toContainText('Cases'); // Assuming a Cases page title

    // Find the newly created case and navigate to its detail page
    // This part might need refinement based on how cases are listed and identified
    const newCaseLink = await page.locator(`a:has-text("E2E Test Case")`).first();
    const caseId = (await newCaseLink.getAttribute('href'))?.split('/').pop();
    expect(caseId).toBeDefined();
    await newCaseLink.click();

    // 7. Verify Case Detail View
    await expect(page.locator('h4')).toContainText('Case: E2E Test Case');
    await expect(page.locator('h5:has-text("Evidence")')).toBeVisible();
    await expect(page.locator('li:has-text("OSINT_DOC")')).toBeVisible(); // Verify the added item is there

    // 8. Export PDF
    await page.locator('button:has-text("Export PDF")').click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.waitForSelector('div[role="alert"]:has-text("Export successful!")'), // Wait for toast
    ]);

    // Verify download
    expect(download.suggestedFilename()).toMatch(/case-.*\.pdf/);
    const path = await download.path();
    expect(path).toBeDefined();
    // You can add more checks here, e.g., read PDF content if a library is available

    // 9. Export HTML
    await page.locator('button:has-text("Export HTML")').click();
    const [downloadHtml] = await Promise.all([
      page.waitForEvent('download'),
      page.waitForSelector('div[role="alert"]:has-text("Export successful!")'), // Wait for toast
    ]);
    expect(downloadHtml.suggestedFilename()).toMatch(/case-.*\.html/);
    const htmlPath = await downloadHtml.path();
    expect(htmlPath).toBeDefined();

    // 10. Export ZIP
    await page.locator('button:has-text("Export ZIP")').click();
    const [downloadZip] = await Promise.all([
      page.waitForEvent('download'),
      page.waitForSelector('div[role="alert"]:has-text("Export successful!")'), // Wait for toast
    ]);
    expect(downloadZip.suggestedFilename()).toMatch(/case-.*\.zip/);
    const zipPath = await downloadZip.path();
    expect(zipPath).toBeDefined();
  });
});
