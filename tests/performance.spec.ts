import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Performance Baseline', () => {
  const metrics: Record<string, any> = {};

  test.afterAll(async () => {
    // Save metrics to file
    const metricsPath = path.join(process.cwd(), 'metrics.json');
    fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
    console.log(`Performance metrics saved to ${metricsPath}`);
  });

  test('Home page load time should be under 2s', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    const end = Date.now();
    const loadTime = end - start;
    metrics['home_page_load_time_ms'] = loadTime;

    expect(loadTime).toBeLessThan(2000);
  });

  test('API response times should average under 200ms', async ({ page }) => {
    const apiTimes: number[] = [];
    page.on('requestfinished', async (request) => {
      if (request.url().includes('/api/')) {
        const timing = request.timing();
        const duration = timing.responseEnd - timing.requestStart;
        if (duration > 0) {
            apiTimes.push(duration);
        }
      }
    });

    await page.goto('/dashboard');
    // Simulate some activity
    await page.waitForTimeout(3000);

    if (apiTimes.length > 0) {
      const avgTime = apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length;
      metrics['avg_api_response_time_ms'] = avgTime;
      console.log(`Average API response time: ${avgTime}ms`);
      expect(avgTime).toBeLessThan(200);
    } else {
        console.warn('No API calls detected during performance test');
    }
  });

  test('Memory usage should remain stable', async ({ page }) => {
    await page.goto('/dashboard');

    // Initial memory
    const initialMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize);

    // Simulate 5 minutes session (compressed to 10s for test speed, but loop activity)
    // In a real scenario this would be longer.
    for (let i = 0; i < 10; i++) {
        await page.evaluate(() => {
            // Simulate some DOM manipulation or data processing
            const div = document.createElement('div');
            div.innerText = 'Test ' + Date.now();
            document.body.appendChild(div);
            document.body.removeChild(div);
        });
        await page.waitForTimeout(500);
    }

    const finalMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize);

    if (initialMemory && finalMemory) {
        const memoryDiff = finalMemory - initialMemory;
        metrics['memory_usage_diff_bytes'] = memoryDiff;
        metrics['final_memory_bytes'] = finalMemory;

        // Ensure no massive leak (e.g., > 50MB increase for this simple test)
        expect(memoryDiff).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test('Bundle size check', async () => {
    // This is a static check, but running it here to consolidate reporting
    const clientBuildPath = path.join(process.cwd(), 'client', 'dist', 'assets');

    if (fs.existsSync(clientBuildPath)) {
        const files = fs.readdirSync(clientBuildPath);
        let totalSize = 0;
        files.forEach(file => {
            if (file.endsWith('.js') || file.endsWith('.css')) {
                const stats = fs.statSync(path.join(clientBuildPath, file));
                totalSize += stats.size;
            }
        });

        metrics['bundle_size_bytes'] = totalSize;
        console.log(`Total bundle size: ${totalSize / 1024 / 1024} MB`);

        // Example budget: 5MB
        expect(totalSize).toBeLessThan(5 * 1024 * 1024);
    } else {
        console.warn('Client build not found, skipping bundle size check');
        metrics['bundle_size_bytes'] = -1;
    }
  });
});
