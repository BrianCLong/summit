// E2E skeleton (skipped) for right-click → expand → AI flow
import { test, expect } from '@playwright/test';

test.describe('Advanced Graph Flow', () => {
  test('right-click expand and AI overlay', async ({ page, request }) => {
    const layout = process.env.LAYOUT || 'cose-bilkent';
    const sprite = process.env.SPRITE_LABELS || '0';
    await page.addInitScript(
      ([layout, sprite]) => {
        localStorage.setItem('graph.layoutName', layout);
        localStorage.setItem('graph.spriteLabels', sprite);
        localStorage.setItem('graph.lodLabels', '1');
        localStorage.setItem('graph.aiPanelOpen', '1');
      },
      [layout, sprite],
    );
    await page.goto('/graph/advanced');
    await expect(page.getByText('AI Panel')).toBeVisible();

    // Seed a node into the graph
    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent('graph:addElements', {
          detail: { nodes: [{ id: 'n1', label: 'Alice' }], edges: [] },
        }),
      );
    });

    // Select node via exposed cy in dev
    await page.evaluate(() => {
      // @ts-ignore
      const cy = (window as any).__cy;
      cy.getElementById('n1').select();
    });

    // Emit AI insight from server dev helper
    const headers: Record<string, string> = {};
    if (process.env.E2E_AUTH_TOKEN)
      headers['Authorization'] = `Bearer ${process.env.E2E_AUTH_TOKEN}`;
    await request.post('http://localhost:4000/dev/ai-insight', {
      data: {
        entityId: 'n1',
        data: {
          summary: 'AI says hello',
          suggestions: ['Expand neighbors'],
          related: [{ id: 'n2', label: 'Bob', type: 'PERSON' }],
        },
      },
      headers,
    });

    // Expect overlay to show the summary
    await expect(page.getByText('AI Insights')).toBeVisible();
    await expect(page.getByText('AI says hello')).toBeVisible();
  });
});
