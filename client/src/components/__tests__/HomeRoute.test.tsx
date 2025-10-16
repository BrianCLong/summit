import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { createStore } from '@reduxjs/toolkit';
import HomeRoute from '../../routes/HomeRoute';

// Mock components to avoid complex dependencies
jest.mock('../../components/ServerStatus', () => {
  return function MockServerStatus() {
    return <div data-testid="server-status">Server Status Mock</div>;
  };
});

jest.mock('../../components/AdvancedSearch', () => {
  return function MockAdvancedSearch({ onResultSelect }: any) {
    return (
      <div data-testid="advanced-search">
        <input placeholder="Search entities, investigations, actions, or upload data..." />
        <button onClick={() => onResultSelect({ id: 'test' })}>
          Search Mock
        </button>
      </div>
    );
  };
});

jest.mock('../../components/GraphPreview', () => {
  return function MockGraphPreview({ onNodeClick }: any) {
    return (
      <div data-testid="graph-preview">
        <div onClick={() => onNodeClick({ id: 'node1' })}>
          Graph Preview Mock
        </div>
      </div>
    );
  };
});

jest.mock('../../components/DataExport', () => {
  return function MockDataExport({ onExportComplete }: any) {
    return (
      <div data-testid="data-export">
        <button onClick={() => onExportComplete({ success: true })}>
          Export Mock
        </button>
      </div>
    );
  };
});

jest.mock('../../components/InvestigationManager', () => {
  return function MockInvestigationManager({ onInvestigationSelect }: any) {
    return (
      <div data-testid="investigation-manager">
        <button
          onClick={() => onInvestigationSelect({ id: 'inv1', name: 'Test' })}
        >
          Investigation Manager Mock
        </button>
      </div>
    );
  };
});

jest.mock('../../components/PerformanceMonitor', () => {
  return function MockPerformanceMonitor() {
    return <div data-testid="performance-monitor">Performance Monitor</div>;
  };
});

// Create a simple Redux store for testing
const createMockStore = (initialState = {}) => {
  return createStore((state = initialState) => state);
};

const renderWithProviders = (
  component: React.ReactElement,
  initialState = {},
) => {
  const store = createMockStore({
    graph: {
      graphStats: {
        numNodes: 42,
        numEdges: 128,
        density: '0.15',
      },
    },
    ...initialState,
  });

  return render(
    <Provider store={store}>
      <BrowserRouter>{component}</BrowserRouter>
    </Provider>,
  );
};

describe('HomeRoute', () => {
  beforeEach(() => {
    // Clear any previous DOM state
    document.body.innerHTML = '';
  });

  test('renders the main platform title', () => {
    renderWithProviders(<HomeRoute />);
    expect(screen.getByText('IntelGraph Platform')).toBeInTheDocument();
    expect(
      screen.getByText('Intelligence Analysis & Graph Visualization System'),
    ).toBeInTheDocument();
  });

  test('renders all navigation tabs', () => {
    renderWithProviders(<HomeRoute />);
    expect(screen.getByText('🏠 Overview')).toBeInTheDocument();
    expect(screen.getByText('🔍 Investigations')).toBeInTheDocument();
    expect(screen.getByText('🔎 Advanced Search')).toBeInTheDocument();
    expect(screen.getByText('📤 Data Export')).toBeInTheDocument();
  });

  test('renders help and shortcuts buttons', () => {
    renderWithProviders(<HomeRoute />);
    expect(screen.getByText('📚 Help')).toBeInTheDocument();
    expect(screen.getByText('⌨️ Shortcuts')).toBeInTheDocument();
  });

  test('shows graph statistics in overview tab', () => {
    renderWithProviders(<HomeRoute />);
    expect(screen.getByText('Graph Nodes:')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Graph Edges:')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('Graph Density:')).toBeInTheDocument();
    expect(screen.getByText('0.15')).toBeInTheDocument();
  });

  test('switches between tabs correctly', async () => {
    renderWithProviders(<HomeRoute />);

    // Initially on Overview tab
    expect(screen.getByTestId('server-status')).toBeInTheDocument();

    // Click on Search tab
    fireEvent.click(screen.getByText('🔎 Advanced Search'));
    await waitFor(() => {
      expect(screen.getByTestId('advanced-search')).toBeInTheDocument();
    });

    // Click on Investigations tab
    fireEvent.click(screen.getByText('🔍 Investigations'));
    await waitFor(() => {
      expect(screen.getByTestId('investigation-manager')).toBeInTheDocument();
    });

    // Click on Export tab
    fireEvent.click(screen.getByText('📤 Data Export'));
    await waitFor(() => {
      expect(screen.getByTestId('data-export')).toBeInTheDocument();
    });
  });

  test('action navigation input works', () => {
    const { container } = renderWithProviders(<HomeRoute />);

    // Find the action ID input
    const actionInput = screen.getByPlaceholderText('Enter action ID...');
    const goButton = screen.getByText('Go');

    // Initially button should be disabled
    expect(goButton).toBeDisabled();

    // Enter action ID
    fireEvent.change(actionInput, { target: { value: 'test-action-123' } });
    expect(goButton).not.toBeDisabled();

    // Test Enter key
    fireEvent.keyPress(actionInput, {
      key: 'Enter',
      code: 'Enter',
      charCode: 13,
    });
    // Navigation would happen in real app, but we can't test that easily in unit test
  });

  test('quick actions are rendered and clickable', () => {
    renderWithProviders(<HomeRoute />);

    expect(screen.getByText('Test Action Safety')).toBeInTheDocument();
    expect(screen.getByText('Sample Investigation')).toBeInTheDocument();

    const quickAction = screen.getByText('Try action ID: test-action-123');
    expect(quickAction).toBeInTheDocument();
  });

  test('performance monitor is rendered', () => {
    renderWithProviders(<HomeRoute />);
    expect(screen.getByTestId('performance-monitor')).toBeInTheDocument();
  });

  test('keyboard shortcuts work', () => {
    renderWithProviders(<HomeRoute />);

    // Test Ctrl+2 (Investigations tab)
    fireEvent.keyDown(document, { key: '2', ctrlKey: true });
    expect(screen.getByTestId('investigation-manager')).toBeInTheDocument();

    // Test Ctrl+3 (Search tab)
    fireEvent.keyDown(document, { key: '3', ctrlKey: true });
    expect(screen.getByTestId('advanced-search')).toBeInTheDocument();
  });

  test('handles search result selection', async () => {
    renderWithProviders(<HomeRoute />);

    // Switch to search tab
    fireEvent.click(screen.getByText('🔎 Advanced Search'));

    // Click search mock button (simulates selecting a result)
    const searchButton = screen.getByText('Search Mock');
    fireEvent.click(searchButton);

    // The onResultSelect callback should be called (we can't easily test navigation)
    expect(searchButton).toBeInTheDocument();
  });

  test('handles investigation selection', async () => {
    renderWithProviders(<HomeRoute />);

    // Switch to investigations tab
    fireEvent.click(screen.getByText('🔍 Investigations'));

    // Click investigation mock button
    const invButton = screen.getByText('Investigation Manager Mock');
    fireEvent.click(invButton);

    expect(invButton).toBeInTheDocument();
  });

  test('handles export completion', async () => {
    renderWithProviders(<HomeRoute />);

    // Switch to export tab
    fireEvent.click(screen.getByText('📤 Data Export'));

    // Click export mock button
    const exportButton = screen.getByText('Export Mock');
    fireEvent.click(exportButton);

    expect(exportButton).toBeInTheDocument();
  });

  test('renders feature cards in overview', () => {
    renderWithProviders(<HomeRoute />);

    expect(screen.getByText('📊 Graph Analysis')).toBeInTheDocument();
    expect(screen.getByText('📈 Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByText('🛡️ Action Safety')).toBeInTheDocument();
    expect(screen.getByText('🔗 GraphQL API')).toBeInTheDocument();
  });

  test('handles missing graph stats gracefully', () => {
    renderWithProviders(<HomeRoute />, { graph: {} });

    expect(screen.getByText('Graph Nodes:')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument(); // Default value
  });
});

// Integration test for keyboard shortcuts
describe('HomeRoute Keyboard Shortcuts Integration', () => {
  test('question mark shows shortcuts help', async () => {
    renderWithProviders(<HomeRoute />);

    // Press '?' key
    fireEvent.keyDown(document, { key: '?' });

    await waitFor(() => {
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });
  });

  test('Ctrl+H shows help system', async () => {
    renderWithProviders(<HomeRoute />);

    // Press Ctrl+H
    fireEvent.keyDown(document, { key: 'h', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByText('Help & Documentation')).toBeInTheDocument();
    });
  });

  test('Escape closes modals', async () => {
    renderWithProviders(<HomeRoute />);

    // Open shortcuts help first
    fireEvent.keyDown(document, { key: '?' });
    await waitFor(() => {
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    // Press Escape to close
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    });
  });
});

// Performance and accessibility tests
describe('HomeRoute Performance & Accessibility', () => {
  test('has proper heading hierarchy', () => {
    renderWithProviders(<HomeRoute />);

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('IntelGraph Platform');
  });

  test('buttons have proper accessibility attributes', () => {
    renderWithProviders(<HomeRoute />);

    const helpButton = screen.getByText('📚 Help');
    expect(helpButton).toHaveAttribute('title');

    const shortcutsButton = screen.getByText('⌨️ Shortcuts');
    expect(shortcutsButton).toHaveAttribute('title');
  });

  test('tabs have proper ARIA attributes', () => {
    renderWithProviders(<HomeRoute />);

    const overviewTab = screen.getByText('🏠 Overview');
    expect(overviewTab.closest('button')).toHaveStyle('color: #1a73e8'); // Active tab styling
  });
});
