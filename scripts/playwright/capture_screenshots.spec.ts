import { test, expect } from '@playwright/test';

const outDir = 'docs/cookbook/screenshots';

test('capture UI screenshots with interactions', async ({ page }) => {
  await page.goto(process.env.UI_URL || 'http://localhost:3000');
  await page.waitForLoadState('networkidle');

  await page.screenshot({ path: `${outDir}/main.png`, fullPage: true });

  // Copilot panel
  try{
    const ta = page.locator('textarea');
    await ta.first().fill('shortest path from A1 to A2');
    const safetyBtn = page.getByRole('button', { name: /Check Safety/i }).first();
    if(await safetyBtn.count()) await safetyBtn.click();
    const cbBtn = page.getByRole('button', { name: /Cookbook/i }).first();
    if(await cbBtn.count()) await cbBtn.click();
    await page.screenshot({ path: `${outDir}/copilot.png`, fullPage: false });
  }catch{}

  // Ingest Wizard
  try{
    const ingest = page.getByText('Ingest Wizard', { exact: false }).first();
    if(await ingest.count()){
      await ingest.scrollIntoViewIfNeeded();
      await ingest.screenshot({ path: `${outDir}/ingest.png` });
    }
  }catch{}

  // Admin
  try{
    const admin = page.getByText('Admin', { exact: false }).first();
    if(await admin.count()){
      await admin.scrollIntoViewIfNeeded();
      const toggle = page.getByRole('button', { name: /Toggle demo-mode/i }).first();
      if(await toggle.count()) await toggle.click();
      await admin.screenshot({ path: `${outDir}/admin.png` });
    }
  }catch{}

  // Cases/Evidence/Triage (full page snapshots)
  await page.screenshot({ path: `${outDir}/cases.png`, fullPage: true });
  await page.screenshot({ path: `${outDir}/triage.png`, fullPage: true });
});
