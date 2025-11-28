import { test, expect } from '@playwright/test';
import path from 'path';
import { spawn } from 'child_process';

const SERVER_CMD = ['python', '-m', 'uvicorn', 'ai.cdis.app:app', '--port', '8080'];

function startServer() {
  const proc = spawn(SERVER_CMD[0], SERVER_CMD.slice(1), {
    env: { ...process.env, CAUSAL_LAB_ENABLED: 'true' },
    stdio: 'inherit',
  });
  return proc;
}

test.describe('discover → intervene → share', () => {
  test('runs the Causal Lab flow', async ({ page }) => {
    const server = startServer();
    await page.waitForTimeout(2000);

    await page.goto('file://' + path.join(process.cwd(), '..', 'ui', 'index.html'));
    await page.getByText('Discover').click();
    await page.waitForTimeout(500);
    await page.getByLabel('treatment').check();
    const slider = page.locator('#treatment-slider');
    await slider.focus();
    await slider.press('ArrowRight');
    await page.getByText('Intervene').click();
    await page.waitForTimeout(500);
    const effects = page.locator('#effects li');
    const count = await effects.count();
    expect(count).toBeGreaterThan(0);
    server.kill();
  });
});
