import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { performance } from 'node:perf_hooks';
import { ProgressiveGraph } from '../src/index.js';
import { buildFixtureGraph } from './helpers/graphFixtures.js';

describe('ProgressiveGraph', () => {
  it('progressively reveals batches while keeping hover/select responsive', async () => {
    vi.useFakeTimers();
    const { nodes, edges } = buildFixtureGraph(240);
    const onHover = vi.fn();
    const onSelect = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ProgressiveGraph
          nodes={nodes}
          edges={edges}
          initialBatchSize={24}
          frameBudgetMs={6}
          onHoverNode={onHover}
          onSelectNode={onSelect}
        />,
      );
    });

    const firstNode = container.querySelector('[data-node-id="node-0"]');
    expect(firstNode).toBeTruthy();
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();

    await act(async () => {
      firstNode?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      firstNode?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });

    expect(onHover).toHaveBeenCalledWith('node-0');
    expect(onSelect).toHaveBeenCalledWith('node-0');

    await act(async () => {
      vi.runAllTimers();
    });
    await act(async () => Promise.resolve());

    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
    vi.useRealTimers();
  });

  it('completes rendering under the performance budget for a dense fixture', async () => {
    const { nodes, edges } = buildFixtureGraph(720);
    const container = document.createElement('div');
    const root = createRoot(container);
    const budgetMs = 140;
    let renderDuration = 0;

    await act(async () => {
      const start = performance.now();
      await new Promise<void>((resolve) => {
        root.render(
          <ProgressiveGraph
            nodes={nodes}
            edges={edges}
            frameBudgetMs={12}
            initialBatchSize={48}
            onRenderComplete={(elapsed) => {
              renderDuration = elapsed;
              resolve();
            }}
          />,
        );
      });
      renderDuration = renderDuration || performance.now() - start;
    });

    expect(renderDuration).toBeGreaterThan(0);
    expect(renderDuration).toBeLessThan(budgetMs);
    expect(container.querySelectorAll('[data-node-id]').length).toBe(nodes.length);
  });

  it('meets the benchmark budget for the maximum fixture graph', async () => {
    const { nodes, edges } = buildFixtureGraph(960);
    const container = document.createElement('div');
    const root = createRoot(container);
    const budgetMs = 120;
    let renderDuration = 0;

    await act(async () => {
      const start = performance.now();
      await new Promise<void>((resolve) => {
        root.render(
          <ProgressiveGraph
            nodes={nodes}
            edges={edges}
            frameBudgetMs={10}
            initialBatchSize={64}
            onRenderComplete={(elapsed) => {
              renderDuration = elapsed;
              resolve();
            }}
          />,
        );
      });
      renderDuration = renderDuration || performance.now() - start;
    });

    expect(renderDuration).toBeGreaterThan(0);
    expect(renderDuration).toBeLessThanOrEqual(budgetMs);
    expect(container.querySelectorAll('[data-node-id]').length).toBe(nodes.length);
  });

  it('lowers detail level automatically when load exceeds threshold', async () => {
    const { nodes, edges } = buildFixtureGraph(520);
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ProgressiveGraph
          nodes={nodes}
          edges={edges}
          initialBatchSize={40}
          frameBudgetMs={10}
        />,
      );
      await Promise.resolve();
    });

    const lod = container.querySelector('[data-lod]')?.getAttribute('data-lod');
    expect(lod).toBe('compact');

    const labels = Array.from(container.querySelectorAll('[data-node-id]')).map(
      (node) => (node as HTMLButtonElement).textContent,
    );
    expect(labels.some((label) => label?.includes('…'))).toBe(true);
  });
});
