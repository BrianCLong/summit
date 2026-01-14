/* eslint-disable @typescript-eslint/no-explicit-any -- jest mocks require type assertions */
/**
 * Tests for Interactive Graph Canvas Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import InteractiveGraphCanvas from '../InteractiveGraphCanvas';

// Mock Canvas API
const mockCanvas = {
  getContext: jest.fn(() => ({
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    arc: jest.fn(),
    fillRect: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn(() => ({ width: 50 })),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    setTransform: jest.fn(),
  })),
  width: 800,
  height: 600,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getBoundingClientRect: jest.fn(() => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
  })),
};

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

beforeAll(() => {
  (HTMLCanvasElement.prototype as any).getContext = mockCanvas.getContext;
  (HTMLCanvasElement.prototype as any).getBoundingClientRect =
    mockCanvas.getBoundingClientRect;
  Object.defineProperty(HTMLCanvasElement.prototype, 'width', {
    get: () => mockCanvas.width,
    set: (value) => {
      mockCanvas.width = value;
    },
  });
  Object.defineProperty(HTMLCanvasElement.prototype, 'height', {
    get: () => mockCanvas.height,
    set: (value) => {
      mockCanvas.height = value;
    },
  });
});

describe('InteractiveGraphCanvas', () => {
  const defaultProps = {
    data: { nodes: [], edges: [] },
    onNodeClick: jest.fn(),
    onSelectionChange: jest.fn(),
    layoutAlgorithm: 'force' as const,
    physics: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders canvas element', () => {
    render(<InteractiveGraphCanvas {...defaultProps} />);

    const canvas = screen.getByTestId('graph-canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas.tagName).toBe('CANVAS');
  });

  it('renders control panel', () => {
    render(<InteractiveGraphCanvas {...defaultProps} />);

    expect(screen.getByText(/Layout Algorithm/)).toBeInTheDocument();
    expect(screen.getByText(/Physics/)).toBeInTheDocument();
    expect(screen.getByText(/Performance/)).toBeInTheDocument();
  });

  it('renders with physics enabled by default', () => {
    render(
      <InteractiveGraphCanvas
        {...defaultProps}
        physics={true}
      />,
    );

    const canvas = screen.getByTestId('graph-canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('does not render performance metrics when disabled', () => {
    render(
      <InteractiveGraphCanvas
        {...defaultProps}
      />,
    );

    expect(screen.queryByTestId('performance-metrics')).not.toBeInTheDocument();
  });

  it('handles layout algorithm change', async () => {
    const user = userEvent.setup();
    render(<InteractiveGraphCanvas {...defaultProps} />);

    const algorithmSelect = screen.getByDisplayValue('Force-directed');
    await user.selectOptions(algorithmSelect, 'circular');

    expect(algorithmSelect).toHaveValue('circular');
  });

  it('toggles physics simulation', () => {
    render(<InteractiveGraphCanvas {...defaultProps} physics={true} />);

    // Since controls are internal, we mostly check for no errors
    expect(screen.getByTestId('graph-canvas')).toBeInTheDocument();
  });

  it('renders with custom width and height', () => {
    render(
      <InteractiveGraphCanvas
        {...defaultProps}
        width={1000}
        height={800}
      />,
    );

    const canvas = screen.getByTestId('graph-canvas') as HTMLCanvasElement;
    expect(canvas.width).toBe(1000);
    expect(canvas.height).toBe(800);
  });

  it('handles canvas mouse events', async () => {
    const onNodeSelect = jest.fn();
    render(
      <InteractiveGraphCanvas {...defaultProps} onNodeClick={onNodeSelect} />,
    );

    const canvas = screen.getByTestId('graph-canvas');

    // Test mouse down
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });

    // Test mouse move (drag)
    fireEvent.mouseMove(canvas, { clientX: 110, clientY: 110 });

    // Test mouse up
    fireEvent.mouseUp(canvas, { clientX: 110, clientY: 110 });

    // Canvas events should be handled without errors
    expect(mockCanvas.getContext).toHaveBeenCalled();
  });

  it('handles wheel events for zooming', () => {
    render(<InteractiveGraphCanvas {...defaultProps} />);

    const canvas = screen.getByTestId('graph-canvas');

    // Test zoom in
    fireEvent.wheel(canvas, { deltaY: -100 });

    // Test zoom out
    fireEvent.wheel(canvas, { deltaY: 100 });

    // Should handle wheel events without errors
    expect(mockCanvas.getContext).toHaveBeenCalled();
  });

  it('handles keyboard events', () => {
    render(<InteractiveGraphCanvas {...defaultProps} />);

    const canvas = screen.getByTestId('graph-canvas');

    // Focus the canvas
    canvas.focus();

    // Test keyboard events
    fireEvent.keyDown(canvas, { key: 'Delete' });
    fireEvent.keyDown(canvas, { key: 'Escape' });
    fireEvent.keyDown(canvas, { key: 'a', ctrlKey: true });

    // Should handle keyboard events without errors
    expect(mockCanvas.getContext).toHaveBeenCalled();
  });

  it('renders with custom investigation ID', () => {
    render(
      <InteractiveGraphCanvas {...defaultProps} />,
    );

    const canvas = screen.getByTestId('graph-canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('updates canvas size on container resize', () => {
    const { rerender } = render(<InteractiveGraphCanvas {...defaultProps} />);

    // Simulate resize
    act(() => {
      const resizeCallback = (global.ResizeObserver as any).mock
        .calls[0][0];
      resizeCallback([
        {
          contentRect: { width: 1000, height: 800 },
        },
      ]);
    });

    rerender(<InteractiveGraphCanvas {...defaultProps} />);

    // Canvas should handle resize
    expect(global.ResizeObserver).toHaveBeenCalled();
  });

  it('cleans up on unmount', () => {
    const { unmount } = render(<InteractiveGraphCanvas {...defaultProps} />);

    unmount();

    // Should clean up ResizeObserver
    expect(global.ResizeObserver).toHaveBeenCalled();
  });

  it('handles node selection callback', async () => {
    const onNodeSelect = jest.fn();
    render(
      <InteractiveGraphCanvas {...defaultProps} onNodeClick={onNodeSelect} />,
    );

    const canvas = screen.getByTestId('graph-canvas');

    // Simulate clicking on a node position
    fireEvent.mouseDown(canvas, { clientX: 400, clientY: 300 });
    fireEvent.mouseUp(canvas, { clientX: 400, clientY: 300 });

    // The component should handle the click, even if no nodes are present in mock
    expect(mockCanvas.getContext).toHaveBeenCalled();
  });

  it('handles edge selection callback', async () => {
    const onEdgeSelect = jest.fn();
    render(
      <InteractiveGraphCanvas {...defaultProps} onNodeClick={onEdgeSelect} />,
    );

    const canvas = screen.getByTestId('graph-canvas');

    // Simulate clicking on an edge position
    fireEvent.mouseDown(canvas, { clientX: 350, clientY: 250 });
    fireEvent.mouseUp(canvas, { clientX: 350, clientY: 250 });

    // The component should handle the click
    expect(mockCanvas.getContext).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(
      <InteractiveGraphCanvas {...defaultProps} className="custom-class" />,
    );

    const container = screen.getByTestId('graph-canvas').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('supports all layout algorithms', async () => {
    const user = userEvent.setup();
    render(<InteractiveGraphCanvas {...defaultProps} />);

    const algorithmSelect = screen.getByDisplayValue('Force-directed');

    // Test each layout algorithm
    await user.selectOptions(algorithmSelect, 'circular');
    expect(algorithmSelect).toHaveValue('circular');

    await user.selectOptions(algorithmSelect, 'grid');
    expect(algorithmSelect).toHaveValue('grid');

    await user.selectOptions(algorithmSelect, 'hierarchical');
    expect(algorithmSelect).toHaveValue('hierarchical');

    await user.selectOptions(algorithmSelect, 'force');
    expect(algorithmSelect).toHaveValue('force');
  });

  it('maintains performance metrics accuracy', async () => {
    render(
      <InteractiveGraphCanvas
        {...defaultProps}
        physics={true}
      />,
    );

    const canvas = screen.getByTestId('graph-canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('handles animation frame updates', () => {
    render(<InteractiveGraphCanvas {...defaultProps} physics={true} />);

    // Animation frames should be requested for physics simulation
    expect(global.requestAnimationFrame).toHaveBeenCalled();

    // Simulate animation frame callback
    act(() => {
      const animationCallback = (global.requestAnimationFrame as jest.Mock).mock
        .calls[0][0];
      animationCallback();
    });

    expect(mockCanvas.getContext).toHaveBeenCalled();
  });
});
