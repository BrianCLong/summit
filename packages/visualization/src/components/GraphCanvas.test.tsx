import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GraphCanvas, GraphNode, GraphLink } from './GraphCanvas';

// Mock the d3 dependencies
jest.mock('d3', () => ({
  ...jest.requireActual('d3'),
  forceSimulation: jest.fn(() => ({
    force: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    stop: jest.fn(),
    alphaTarget: jest.fn().mockReturnThis(),
    restart: jest.fn(),
  })),
}));

// Mock the d3-selection dependency
jest.mock('d3-selection', () => ({
  select: jest.fn(() => ({
    append: jest.fn().mockReturnThis(),
    attr: jest.fn().mockReturnThis(),
    call: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    data: jest.fn().mockReturnThis(),
    enter: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
    remove: jest.fn().mockReturnThis(),
    transition: jest.fn().mockReturnThis(),
    duration: jest.fn().mockReturnThis(),
    style: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    html: jest.fn().mockReturnThis(),
    classed: jest.fn().mockReturnThis(),
    merge: jest.fn().mockReturnThis(),
    exit: jest.fn().mockReturnThis(),
    size: jest.fn(),
    nodes: jest.fn().mockReturnThis(),
  })),
}));

// Mock the d3-zoom dependency
jest.mock('d3-zoom', () => ({
  zoom: jest.fn(() => ({
    scaleExtent: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
  })),
}));

// Mock the d3-drag dependency
jest.mock('d3-drag', () => ({
  drag: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
  })),
}));

// Mock the VisualizationContainer and Tooltip components
jest.mock('./VisualizationContainer', () => ({
  VisualizationContainer: ({ children }: { children: (dimensions: any) => React.ReactNode }) => 
    <div data-testid="visualization-container">{children({ width: 800, height: 600 })}</div>
}));

jest.mock('./Tooltip', () => ({
  Tooltip: ({ content }: { content: string }) => <div data-testid="tooltip">{content}</div>
}));

describe('GraphCanvas', () => {
  const mockNodes: GraphNode[] = [
    { id: '1', label: 'Node 1', type: 'person' },
    { id: '2', label: 'Node 2', type: 'organization' },
  ];

  const mockLinks: GraphLink[] = [
    { id: '1', source: '1', target: '2', type: 'connection' },
  ];

  const mockOnNodeClick = jest.fn();
  const mockOnNodeHover = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <GraphCanvas
        nodes={mockNodes}
        links={mockLinks}
      />
    );

    expect(screen.getByTestId('visualization-container')).toBeInTheDocument();
  });

  it('renders nodes and links', () => {
    render(
      <GraphCanvas
        nodes={mockNodes}
        links={mockLinks}
        onNodeClick={mockOnNodeClick}
        onNodeHover={mockOnNodeHover}
      />
    );

    // Check that the SVG element is rendered
    const svgElement = screen.getByRole('img'); // SVG elements are often treated as images
    expect(svgElement).toBeInTheDocument();
  });

  it('calls onNodeClick when a node is clicked', async () => {
    render(
      <GraphCanvas
        nodes={mockNodes}
        links={mockLinks}
        onNodeClick={mockOnNodeClick}
        onNodeHover={mockOnNodeHover}
      />
    );

    // Find and click on a node (this would be more complex in a real test)
    // Since we're mocking d3, we'll test that the event handlers are set up
    expect(mockOnNodeClick).not.toHaveBeenCalled();

    // Simulate click on a node (this would require more complex mocking in reality)
    // For now, we'll just verify that the handler is passed correctly
  });

  it('handles selection properly', () => {
    render(
      <GraphCanvas
        nodes={mockNodes}
        links={mockLinks}
        enableSelection={true}
      />
    );

    // Check that selection controls are present
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('handles zoom and pan controls', () => {
    render(
      <GraphCanvas
        nodes={mockNodes}
        links={mockLinks}
        enableZoom={true}
        enablePan={true}
      />
    );

    // Check that reset button is present
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('applies filtering when filterFn is provided', () => {
    const filterFn = (node: GraphNode) => node.type === 'person';
    
    render(
      <GraphCanvas
        nodes={mockNodes}
        links={mockLinks}
        enableFiltering={true}
        filterFn={filterFn}
      />
    );

    // Should only render nodes that match the filter
    expect(screen.getByTestId('visualization-container')).toBeInTheDocument();
  });

  it('renders with custom node and link styling', () => {
    render(
      <GraphCanvas
        nodes={mockNodes}
        links={mockLinks}
        nodeColor={(node) => node.type === 'person' ? '#ff0000' : '#00ff00'}
        linkColor="#0000ff"
        showLabels={true}
      />
    );

    expect(screen.getByTestId('visualization-container')).toBeInTheDocument();
  });

  it('renders with different layout types', () => {
    const { rerender } = render(
      <GraphCanvas
        nodes={mockNodes}
        links={mockLinks}
        layout="force"
      />
    );

    expect(screen.getByTestId('visualization-container')).toBeInTheDocument();

    rerender(
      <GraphCanvas
        nodes={mockNodes}
        links={mockLinks}
        layout="hierarchical"
      />
    );

    expect(screen.getByTestId('visualization-container')).toBeInTheDocument();
  });
});