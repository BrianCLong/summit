import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Graph from '../Graph';
import cytoscape from 'cytoscape';

vi.mock('cytoscape');

describe('Graph', () => {
  const buildCyMock = () => ({
    on: vi.fn(),
    startBatch: vi.fn(),
    endBatch: vi.fn(),
    zoom: vi.fn().mockReturnValue(1),
    nodes: vi.fn().mockReturnValue({ style: vi.fn() }),
    edges: vi.fn().mockReturnValue({ style: vi.fn() }),
    elements: vi.fn().mockReturnValue({
      addClass: vi.fn(),
      removeClass: vi.fn(),
    }),
    json: vi.fn().mockReturnValue({ elements: [] }),
    destroy: vi.fn(),
    removeListener: vi.fn(),
  });

  it('uses deception heatmap style', () => {
    cytoscape.mockReturnValue(buildCyMock());

    render(
      <Graph elements={{ nodes: [], edges: [] }} neighborhoodMode={false} />,
    );
    const style = cytoscape.mock.calls[0][0].style.find(
      (s) => s.selector === 'node',
    );
    expect(style.style['background-color']).toContain('deception_score');
  });

  it('includes forecast edge style', () => {
    cytoscape.mockClear();
    cytoscape.mockReturnValue(buildCyMock());

    render(
      <Graph elements={{ nodes: [], edges: [] }} neighborhoodMode={false} />,
    );
    const style = cytoscape.mock.calls[0][0].style.find(
      (s) => s.selector === '.forecast',
    );
    expect(style.style['line-style']).toBe('dashed');
  });

  it('removes neighborhood tap listener when toggled off', () => {
    const cyMock = buildCyMock();
    cytoscape.mockClear();
    cytoscape.mockReturnValue(cyMock);

    const { rerender } = render(
      <Graph elements={{ nodes: [], edges: [] }} neighborhoodMode={true} />,
    );
    rerender(<Graph elements={{ nodes: [], edges: [] }} neighborhoodMode={false} />);

    expect(cyMock.removeListener).toHaveBeenCalledWith(
      'tap',
      'node',
      expect.any(Function),
    );
  });
});
