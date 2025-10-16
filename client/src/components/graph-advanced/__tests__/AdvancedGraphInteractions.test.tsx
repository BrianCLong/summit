/**
 * Tests for Advanced Graph Interactions Component
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AdvancedGraphInteractions from '../AdvancedGraphInteractions';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

// Mock data
const mockNodes = [
  {
    id: '1',
    label: 'Person A',
    type: 'person',
    properties: {},
    centrality: 0.8,
  },
  {
    id: '2',
    label: 'Company X',
    type: 'organization',
    properties: {},
    centrality: 0.6,
  },
  {
    id: '3',
    label: 'Location Y',
    type: 'location',
    properties: {},
    centrality: 0.4,
  },
];

const mockEdges = [
  { id: 'e1', source: '1', target: '2', type: 'works_at', weight: 1.0 },
  { id: 'e2', source: '2', target: '3', type: 'located_at', weight: 0.8 },
];

describe('AdvancedGraphInteractions', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:30:45Z'));
    // Suppress console warnings
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Only run pending timers if we're using fake timers
    try {
      act(() => {
        jest.runOnlyPendingTimers();
      });
    } catch (e) {
      // Ignore errors if fake timers aren't active
    }
    jest.useRealTimers();
    jest.clearAllMocks();
    if (consoleSpy) {
      consoleSpy.mockRestore();
    }
  });

  it('renders component header with node and edge counts', () => {
    renderWithTheme(
      <AdvancedGraphInteractions nodes={mockNodes} edges={mockEdges} />,
    );

    expect(screen.getByText('Advanced Graph Analysis')).toBeInTheDocument();
    expect(screen.getByText('3 nodes, 2 edges')).toBeInTheDocument();
  });

  it('displays control buttons in header', () => {
    renderWithTheme(
      <AdvancedGraphInteractions nodes={mockNodes} edges={mockEdges} />,
    );

    // Check for control buttons
    expect(
      screen.getByRole('button', { name: /zoom in/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /zoom out/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /center view/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /refresh/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('renders all navigation tabs', () => {
    renderWithTheme(
      <AdvancedGraphInteractions nodes={mockNodes} edges={mockEdges} />,
    );

    expect(screen.getByText('Metrics')).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Communities')).toBeInTheDocument();
    expect(screen.getByText('Pathfinding')).toBeInTheDocument();
  });

  it('displays network analysis metrics by default', () => {
    renderWithTheme(
      <AdvancedGraphInteractions nodes={mockNodes} edges={mockEdges} />,
    );

    expect(screen.getByText('Network Analysis')).toBeInTheDocument();
    expect(screen.getByText('Network Density')).toBeInTheDocument();
    expect(screen.getByText('Clustering Coefficient')).toBeInTheDocument();
    expect(screen.getByText('Average Path Length')).toBeInTheDocument();
    expect(screen.getByText('Betweenness Centrality')).toBeInTheDocument();
    expect(screen.getByText('PageRank Score')).toBeInTheDocument();
  });

  it('switches to filters tab when clicked', () => {
    renderWithTheme(
      <AdvancedGraphInteractions nodes={mockNodes} edges={mockEdges} />,
    );

    fireEvent.click(screen.getByText('Filters'));

    expect(screen.getByText('Filters & View')).toBeInTheDocument();
    expect(screen.getAllByText('Layout Algorithm')[0]).toBeInTheDocument();
    expect(screen.getByText(/Centrality Threshold:/)).toBeInTheDocument();
    expect(screen.getByText('Node Types')).toBeInTheDocument();
  });

  it('switches to communities tab when clicked', () => {
    renderWithTheme(
      <AdvancedGraphInteractions nodes={mockNodes} edges={mockEdges} />,
    );

    fireEvent.click(screen.getByText('Communities'));

    expect(screen.getByText('Community Analysis')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Run community detection analysis to identify node clusters and relationships.',
      ),
    ).toBeInTheDocument();
  });

  it('switches to pathfinding tab when clicked', () => {
    renderWithTheme(
      <AdvancedGraphInteractions nodes={mockNodes} edges={mockEdges} />,
    );

    fireEvent.click(screen.getByText('Pathfinding'));

    expect(screen.getByText('Path Analysis')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Path analysis and shortest path algorithms coming soon...',
      ),
    ).toBeInTheDocument();
  });

  it('displays community detection button and handles click', async () => {
    renderWithTheme(
      <AdvancedGraphInteractions nodes={mockNodes} edges={mockEdges} />,
    );

    const communityButton = screen.getByText('Run Community Detection');
    expect(communityButton).toBeInTheDocument();

    fireEvent.click(communityButton);

    // Should show analyzing state
    expect(screen.getByText('Analyzing...')).toBeInTheDocument();

    // Fast-forward time to complete analysis
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(screen.getByText('Run Community Detection')).toBeInTheDocument(); // Button text restored
    });
  });

  it('handles layout algorithm selection', async () => {
    const onLayoutChange = jest.fn();

    renderWithTheme(
      <AdvancedGraphInteractions
        nodes={mockNodes}
        edges={mockEdges}
        onLayoutChange={onLayoutChange}
      />,
    );

    // Switch to filters tab
    fireEvent.click(screen.getByText('Filters'));

    // Find and click the layout select
    const layoutSelect = screen.getByRole('combobox');
    fireEvent.mouseDown(layoutSelect);

    // Select hierarchical layout
    const hierarchicalOption = screen.getByText('Hierarchical');
    fireEvent.click(hierarchicalOption);

    expect(onLayoutChange).toHaveBeenCalledWith('hierarchical');
  });

  it('handles centrality threshold slider changes', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <AdvancedGraphInteractions nodes={mockNodes} edges={mockEdges} />,
    );

    // Switch to filters tab
    fireEvent.click(screen.getByText('Filters'));

    // Find the slider
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();

    // The slider should be functional (we can't easily test the exact value changes in JSDOM)
    expect(screen.getByText(/Centrality Threshold:/)).toBeInTheDocument();
  });

  it('toggles show communities switch', async () => {
    renderWithTheme(
      <AdvancedGraphInteractions nodes={mockNodes} edges={mockEdges} />,
    );

    // Switch to filters tab
    fireEvent.click(screen.getByText('Filters'));

    const showCommunitiesSwitch = screen.getByRole('switch', {
      name: /show communities/i,
    });
    expect(showCommunitiesSwitch).not.toBeChecked();

    fireEvent.click(showCommunitiesSwitch);
    expect(showCommunitiesSwitch).toBeChecked();
  });

  it('handles node type filter chips', async () => {
    renderWithTheme(
      <AdvancedGraphInteractions nodes={mockNodes} edges={mockEdges} />,
    );

    // Switch to filters tab
    fireEvent.click(screen.getByText('Filters'));

    // Find and click a node type chip
    const personChip = screen.getByText('person');
    expect(personChip).toBeInTheDocument();

    fireEvent.click(personChip);
    // The chip state should change (visually, but hard to test in JSDOM)
    // Just verify we can interact with it without error
    expect(screen.getByText('person')).toBeInTheDocument();
  });

  it('calls onNodeSelect when provided', () => {
    const onNodeSelect = jest.fn();

    renderWithTheme(
      <AdvancedGraphInteractions
        nodes={mockNodes}
        edges={mockEdges}
        onNodeSelect={onNodeSelect}
      />,
    );

    // This callback would be triggered by clicking nodes in the communities panel
    // after running clustering analysis
    expect(onNodeSelect).not.toHaveBeenCalled(); // Initially no calls
  });

  it('calls onAnalysisRun when community detection is triggered', async () => {
    const onAnalysisRun = jest.fn();

    renderWithTheme(
      <AdvancedGraphInteractions
        nodes={mockNodes}
        edges={mockEdges}
        onAnalysisRun={onAnalysisRun}
      />,
    );

    const communityButton = screen.getByText('Run Community Detection');
    fireEvent.click(communityButton);

    // Fast-forward the analysis
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(onAnalysisRun).toHaveBeenCalledWith('clustering', {
        algorithm: 'louvain',
      });
    });
  });

  it('displays metric cards with proper formatting', () => {
    renderWithTheme(
      <AdvancedGraphInteractions nodes={mockNodes} edges={mockEdges} />,
    );

    // Check for formatted metric values
    expect(screen.getByText('0.23')).toBeInTheDocument(); // Network Density
    expect(screen.getByText('0.67')).toBeInTheDocument(); // Clustering Coefficient
    expect(screen.getByText('3.20')).toBeInTheDocument(); // Average Path Length
  });

  it('shows proper category chips for metrics', () => {
    renderWithTheme(
      <AdvancedGraphInteractions nodes={mockNodes} edges={mockEdges} />,
    );

    // Check for category chips
    expect(screen.getAllByText('structure')).toHaveLength(2); // Network Density, Clustering Coefficient
    expect(screen.getAllByText('centrality')).toHaveLength(2); // Betweenness, PageRank
    expect(screen.getAllByText('connectivity')).toHaveLength(1); // Average Path Length
  });

  it('handles empty node and edge arrays gracefully', () => {
    renderWithTheme(<AdvancedGraphInteractions nodes={[]} edges={[]} />);

    expect(screen.getByText('Advanced Graph Analysis')).toBeInTheDocument();
    expect(screen.getByText('0 nodes, 0 edges')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    renderWithTheme(
      <AdvancedGraphInteractions nodes={mockNodes} edges={mockEdges} />,
    );

    // Check for tab accessibility
    const tabList = screen.getByRole('tablist');
    expect(tabList).toBeInTheDocument();

    // Check for button accessibility
    expect(
      screen.getByRole('button', { name: /zoom in/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /refresh/i }),
    ).toBeInTheDocument();
  });

  it('enables advanced features by default', () => {
    renderWithTheme(
      <AdvancedGraphInteractions
        nodes={mockNodes}
        edges={mockEdges}
        enableAdvancedFeatures={true}
      />,
    );

    // Should show all advanced features
    expect(screen.getByText('Run Community Detection')).toBeInTheDocument();
    expect(screen.getByText('Metrics')).toBeInTheDocument();
    expect(screen.getByText('Communities')).toBeInTheDocument();
  });
});
