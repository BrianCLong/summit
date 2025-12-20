import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import { ProgressiveGraph } from '../src/index.js';
import { buildFixtureGraph } from './fixtures/graph.js';

describe('ProgressiveGraph benchmark', () => {
  it('renders a dense fixture within the upper render budget', async () => {
    const { nodes, edges } = buildFixtureGraph(900);
    const container = document.createElement('div');
    const root = createRoot(container);
    let renderDuration = 0;

    await act(async () => {
      const start = performance.now();
      await new Promise<void>((resolve) => {
        root.render(
          <ProgressiveGraph
            nodes={nodes}
            edges={edges}
            initialBatchSize={64}
            frameBudgetMs={12}
            onRenderComplete={(elapsed) => {
              renderDuration = elapsed;
              resolve();
            }}
          />,
        );
      });
      renderDuration = renderDuration || performance.now() - start;
    });

    const renderedCount = Number(
      container
        .querySelector('[data-rendered-count]')
        ?.getAttribute('data-rendered-count'),
    );
    const busy = container.querySelector('[role="region"]')?.getAttribute('aria-busy');

    expect(renderDuration).toBeGreaterThan(0);
    expect(renderDuration).toBeLessThan(200);
    expect(renderedCount).toBe(nodes.length);
    expect(busy === null || busy === 'false').toBe(true);
  });
});
