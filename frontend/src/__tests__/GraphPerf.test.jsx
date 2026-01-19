import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Graph from '../Graph';
import cytoscape from 'cytoscape';

vi.mock('cytoscape');

// Skipping this test as it requires environment setup fix for @vitejs/plugin-react
describe.skip('Graph Performance', () => {
  it('should initialize cytoscape only once and update elements', () => {
    // Mock cytoscape instance methods
    const mockCyInstance = {
      on: vi.fn(),
      startBatch: vi.fn(),
      endBatch: vi.fn(),
      zoom: vi.fn().mockReturnValue(1),
      nodes: vi.fn().mockReturnValue({ style: vi.fn() }),
      edges: vi.fn().mockReturnValue({ style: vi.fn() }),
      destroy: vi.fn(),
      elements: vi.fn().mockReturnValue({
        remove: vi.fn(),
        addClass: vi.fn(),
        removeClass: vi.fn(),
      }),
      add: vi.fn(),
      resize: vi.fn(),
      removeListener: vi.fn(),
      json: vi.fn().mockReturnValue({ elements: [] }),
      getElementById: vi.fn().mockReturnValue({ position: vi.fn(), length: 1 }),
    };

    cytoscape.mockReturnValue(mockCyInstance);

    // Initial render
    const initialElements = { nodes: [{ data: { id: '1', label: '1' } }], edges: [] };
    const { rerender } = render(
      <Graph elements={initialElements} neighborhoodMode={false} />
    );

    // First check: Cytoscape should be initialized once
    expect(cytoscape).toHaveBeenCalledTimes(1);

    // Check if elements were added (since we start empty now)
    expect(mockCyInstance.add).toHaveBeenCalledWith(initialElements);

    // Rerender with new elements
    const newElements = { nodes: [{ data: { id: '1', label: '1' } }, { data: { id: '2', label: '2' } }], edges: [] };
    rerender(
      <Graph elements={newElements} neighborhoodMode={false} />
    );

    // Optimization check: Cytoscape should NOT be re-initialized
    expect(cytoscape).toHaveBeenCalledTimes(1);

    // Check if old elements removed and new ones added
    expect(mockCyInstance.elements().remove).toHaveBeenCalled();
    expect(mockCyInstance.add).toHaveBeenCalledWith(newElements);
  });
});
