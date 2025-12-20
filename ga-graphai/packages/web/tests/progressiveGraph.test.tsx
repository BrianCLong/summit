import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { performance } from 'node:perf_hooks';
import { ProgressiveGraph, type GraphEdge, type GraphNode } from '../src/index.js';

function buildFixtureGraph(count: number): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = Array.from({ length: count }, (_, index) => ({
    id: `node-${index}`,
    label: `Node ${index}`,
    x: (index % 25) * 18,
    y: Math.floor(index / 25) * 18,
  }));

  const edges: GraphEdge[] = nodes.slice(1).map((node, index) => ({
    id: `edge-${index}`,
    from: nodes[index].id,
    to: node.id,
  }));

  return { nodes, edges };
}

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

  it('completes rendering under the performance budget for a dense fixture', async () => {
    const { nodes, edges } = buildFixtureGraph(720);
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
            frameBudgetMs={12}
            initialBatchSize={48}
            onRenderComplete={(elapsed) => {
              renderDuration = elapsed;
              resolve();
            }}
          />,
        );
      });
      await Promise.resolve();
      renderDuration = renderDuration || performance.now() - start;
    });

    expect(renderDuration).toBeGreaterThan(0);
    expect(renderDuration).toBeLessThan(140);
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
