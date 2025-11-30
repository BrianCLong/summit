import { expect, test } from '@playwright/test';

const pageTemplate = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>CHM Flow</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 16px; }
      .banner { border: 2px solid #b00020; padding: 12px; margin-bottom: 12px; background: #ffe8e8; }
      .ribbon { background: #b00020; color: white; padding: 4px 8px; }
      .stamp { border: 2px dashed #0f766e; padding: 6px; display: inline-block; }
    </style>
  </head>
  <body>
    <section class="banner">
      <div class="ribbon">Controlled Handling</div>
      <div class="stamp" id="doc-stamp">No tag applied</div>
      <p id="status">Status: idle</p>
      <label>
        <input id="derived-toggle" type="checkbox" /> Derived-from marking
      </label>
      <span id="derived-label" class="stamp" style="display:none">Derived from controlled source</span>
    </section>

    <div>
      <button id="apply">Apply CHM-TS Tag</button>
      <button id="export">Attempt Export</button>
      <button id="approve-a">Approve A</button>
      <button id="approve-b">Approve B</button>
    </div>

    <script>
      let classification = null;
      let approvals = new Set();

      document.getElementById('apply').onclick = () => {
        classification = 'TS';
        document.getElementById('doc-stamp').textContent = 'CHM-TS applied';
        document.getElementById('status').textContent = 'Status: tag applied';
      };

      document.getElementById('export').onclick = () => {
        if (classification === 'TS') {
          document.getElementById('status').textContent = 'Status: export blocked (residency/license)';
          return;
        }
        document.getElementById('status').textContent = 'Status: export allowed after downgrade';
      };

      function attemptDowngrade() {
        if (approvals.size >= 2) {
          classification = 'S';
          document.getElementById('doc-stamp').textContent = 'CHM-S downgraded';
          document.getElementById('status').textContent = 'Status: downgrade approved';
        }
      }

      document.getElementById('approve-a').onclick = () => {
        approvals.add('a');
        attemptDowngrade();
      };
      document.getElementById('approve-b').onclick = () => {
        approvals.add('b');
        attemptDowngrade();
      };

      document.getElementById('derived-toggle').addEventListener('change', (e) => {
        document.getElementById('derived-label').style.display = e.target.checked ? 'inline-block' : 'none';
      });
    </script>
  </body>
</html>`;

test('apply tag → blocked export → approved downgrade → export', async ({ page }) => {
  await page.setContent(pageTemplate);

  await page.getByText('Apply CHM-TS Tag').click();
  await expect(page.locator('#doc-stamp')).toHaveText('CHM-TS applied');

  await page.getByText('Attempt Export').click();
  await expect(page.locator('#status')).toHaveText('Status: export blocked (residency/license)');

  await page.getByText('Approve A').click();
  await page.getByText('Approve B').click();
  await expect(page.locator('#doc-stamp')).toHaveText('CHM-S downgraded');
  await expect(page.locator('#status')).toHaveText('Status: downgrade approved');

  await page.getByText('Attempt Export').click();
  await expect(page.locator('#status')).toHaveText('Status: export allowed after downgrade');

  await page.getByLabel('Derived-from marking').check();
  await expect(page.locator('#derived-label')).toBeVisible();
});
