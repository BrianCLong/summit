import { test, expect } from '@playwright/test';

test('Ingest Wizard E2E', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  // Step 1: Source
  await page.setInputFiles('input[type="file"]', {
    name: 'test.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('header1,header2\nvalue1,value2'),
  });
  await page.click('button:has-text("Next")');

  // Step 2: Map
  await page.waitForSelector('h2:has-text("Step 2: Map Fields")');
  await page.click('button:has-text("Next")');

  // Step 3: Policies
  await page.waitForSelector('h2:has-text("Step 3: Apply Policies")');
  await page.click('button:has-text("Next")');

  // Step 4: Preview
  await page.waitForSelector('h2:has-text("Step 4: Preview")');
  await page.click('button:has-text("Next")');

  // Step 5: Load
  await page.waitForSelector('h2:has-text("Step 5: Load")');
  await page.click('button:has-text("Start Ingestion")');

  // We can't easily test the backend processing in this E2E test,
  // but we can at least ensure the UI flow works.
});
