import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { MAX_VISIBLE_NODES, ProgressiveGraph } from '../src/index.js';
import { buildFixtureGraph } from './fixtures/graph.js';

describe('ProgressiveGraph', () => {
  it('progressively reveals batches while keeping hover/select responsive', async () => {
    const { nodes, edges } = buildFixtureGraph(180);
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
          onHoverNode={onHover}
          onSelectNode={onSelect}
        />,
      );
      await Promise.resolve();
    });

    const region = container.querySelector('[role="region"]');
    expect(region?.getAttribute('aria-busy')).toBe('true');

    const renderedBatch = container.querySelectorAll('[data-node-id]').length;
    expect(renderedBatch).toBeGreaterThanOrEqual(24);
    expect(renderedBatch).toBeLessThan(nodes.length);

    const firstNode = container.querySelector('[data-node-id="node-0"]');
    expect(firstNode).toBeTruthy();

    await act(async () => {
      firstNode?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    expect(onHover).toHaveBeenCalledWith('node-0');

    await act(async () => {
      firstNode?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
    });
    expect(onSelect).toHaveBeenCalledWith('node-0');
  });

  it('keeps hover/select responsive while rendering remains busy', async () => {
    const { nodes, edges } = buildFixtureGraph(320);
    const onHover = vi.fn();
    const onSelect = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ProgressiveGraph
          nodes={nodes}
          edges={edges}
          initialBatchSize={12}
          frameBudgetMs={6}
          onHoverNode={onHover}
          onSelectNode={onSelect}
        />,
      );
      await Promise.resolve();
    });

    const renderSurface = container.querySelector('[data-rendered-count]');
    const renderedCount = Number(renderSurface?.getAttribute('data-rendered-count'));
    expect(renderedCount).toBeGreaterThan(0);
    expect(renderedCount).toBeLessThan(nodes.length);

    const firstNode = container.querySelector('[data-node-id="node-0"]');
    expect(firstNode).toBeTruthy();

    await act(async () => {
      firstNode?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      firstNode?.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true, code: 'Space' }),
      );
    });

    expect(onHover).toHaveBeenCalledWith('node-0');
    expect(onSelect).toHaveBeenCalledWith('node-0');
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

  it('caps DOM load while keeping interactions accessible on very large graphs', async () => {
    const { nodes, edges } = buildFixtureGraph(2400);
    const onHover = vi.fn();
    const onSelect = vi.fn();
    const onRenderComplete = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ProgressiveGraph
          nodes={nodes}
          edges={edges}
          initialBatchSize={96}
          frameBudgetMs={10}
          onHoverNode={onHover}
          onSelectNode={onSelect}
          onRenderComplete={onRenderComplete}
        />,
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });

    const renderedCount = Number(
      container
        .querySelector('[data-rendered-count]')
        ?.getAttribute('data-rendered-count'),
    );
    const busy = container.querySelector('[role="region"]');

    expect(renderedCount).toBe(MAX_VISIBLE_NODES);
    expect(busy?.getAttribute('aria-busy')).toBe('false');
    expect(onRenderComplete).toHaveBeenCalled();

    const firstNode = container.querySelector('[data-node-id="node-0"]');
    await act(async () => {
      firstNode?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      firstNode?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onHover).toHaveBeenCalledWith('node-0');
    expect(onSelect).toHaveBeenCalledWith('node-0');
  });
});
