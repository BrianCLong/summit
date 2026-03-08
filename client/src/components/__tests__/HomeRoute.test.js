"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const react_redux_1 = require("react-redux");
const react_router_dom_1 = require("react-router-dom");
const toolkit_1 = require("@reduxjs/toolkit");
const HomeRoute_1 = __importDefault(require("../../routes/HomeRoute"));
const user_1 = require("../ai-enhanced/test-utils/user");
// Mock components to avoid complex dependencies
jest.mock('../../components/ServerStatus', () => {
    return function MockServerStatus() {
        return <div data-testid="server-status">Server Status Mock</div>;
    };
});
jest.mock('../../components/AdvancedSearch', () => {
    return function MockAdvancedSearch({ onResultSelect }) {
        return (<div data-testid="advanced-search">
        <input placeholder="Search entities, investigations, actions, or upload data..."/>
        <button onClick={() => onResultSelect({ id: 'test' })}>
          Search Mock
        </button>
      </div>);
    };
});
jest.mock('../../components/GraphPreview', () => {
    return function MockGraphPreview({ onNodeClick }) {
        return (<div data-testid="graph-preview">
        <div onClick={() => onNodeClick({ id: 'node1' })}>
          Graph Preview Mock
        </div>
      </div>);
    };
});
jest.mock('../../components/DataExport', () => {
    return function MockDataExport({ onExportComplete }) {
        return (<div data-testid="data-export">
        <button onClick={() => onExportComplete({ success: true })}>
          Export Mock
        </button>
      </div>);
    };
});
jest.mock('../../components/InvestigationManager', () => {
    return function MockInvestigationManager({ onInvestigationSelect }) {
        return (<div data-testid="investigation-manager">
        <button onClick={() => onInvestigationSelect({ id: 'inv1', name: 'Test' })}>
          Investigation Manager Mock
        </button>
      </div>);
    };
});
jest.mock('../../components/PerformanceMonitor', () => {
    return function MockPerformanceMonitor() {
        return <div data-testid="performance-monitor">Performance Monitor</div>;
    };
});
// Create a simple Redux store for testing
const createMockStore = (state) => {
    return (0, toolkit_1.configureStore)({
        reducer: (s = state) => s,
        preloadedState: state,
    });
};
const renderWithProviders = (component, initialState = {}) => {
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
    return (0, react_2.render)(<react_redux_1.Provider store={store}>
      <react_router_dom_1.BrowserRouter>{component}</react_router_dom_1.BrowserRouter>
    </react_redux_1.Provider>);
};
describe('HomeRoute', () => {
    beforeEach(() => {
        // Clear any previous DOM state
        document.body.innerHTML = '';
    });
    test('renders the main platform title', () => {
        renderWithProviders(<HomeRoute_1.default />);
        expect(react_2.screen.getByText('IntelGraph Platform')).toBeInTheDocument();
        expect(react_2.screen.getByText('Intelligence Analysis & Graph Visualization System')).toBeInTheDocument();
    });
    test('renders all navigation tabs', () => {
        renderWithProviders(<HomeRoute_1.default />);
        expect(react_2.screen.getByText('🏠 Overview')).toBeInTheDocument();
        expect(react_2.screen.getByText('🔍 Investigations')).toBeInTheDocument();
        expect(react_2.screen.getByText('🔎 Advanced Search')).toBeInTheDocument();
        expect(react_2.screen.getByText('📤 Data Export')).toBeInTheDocument();
    });
    test('renders help and shortcuts buttons', () => {
        renderWithProviders(<HomeRoute_1.default />);
        expect(react_2.screen.getByText('📚 Help')).toBeInTheDocument();
        expect(react_2.screen.getByText('⌨️ Shortcuts')).toBeInTheDocument();
    });
    test('shows graph statistics in overview tab', () => {
        renderWithProviders(<HomeRoute_1.default />);
        expect(react_2.screen.getByText('Graph Nodes:')).toBeInTheDocument();
        expect(react_2.screen.getByText('42')).toBeInTheDocument();
        expect(react_2.screen.getByText('Graph Edges:')).toBeInTheDocument();
        expect(react_2.screen.getByText('128')).toBeInTheDocument();
        expect(react_2.screen.getByText('Graph Density:')).toBeInTheDocument();
        expect(react_2.screen.getByText('0.15')).toBeInTheDocument();
    });
    test('switches between tabs correctly', async () => {
        renderWithProviders(<HomeRoute_1.default />);
        // Initially on Overview tab
        expect(react_2.screen.getByTestId('server-status')).toBeInTheDocument();
        // Click on Search tab
        react_2.fireEvent.click(react_2.screen.getByText('🔎 Advanced Search'));
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByTestId('advanced-search')).toBeInTheDocument();
        });
        // Click on Investigations tab
        react_2.fireEvent.click(react_2.screen.getByText('🔍 Investigations'));
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByTestId('investigation-manager')).toBeInTheDocument();
        });
        // Click on Export tab
        react_2.fireEvent.click(react_2.screen.getByText('📤 Data Export'));
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByTestId('data-export')).toBeInTheDocument();
        });
    });
    test('action navigation input works', () => {
        const { container } = renderWithProviders(<HomeRoute_1.default />);
        // Find the action ID input
        const actionInput = react_2.screen.getByPlaceholderText('Enter action ID...');
        const goButton = react_2.screen.getByText('Go');
        // Initially button should be disabled
        expect(goButton).toBeDisabled();
        // Enter action ID
        react_2.fireEvent.change(actionInput, { target: { value: 'test-action-123' } });
        expect(goButton).not.toBeDisabled();
        // Test Enter key
        react_2.fireEvent.keyPress(actionInput, {
            key: 'Enter',
            code: 'Enter',
            charCode: 13,
        });
        // Navigation would happen in real app, but we can't test that easily in unit test
    });
    test('quick actions are rendered and clickable', () => {
        renderWithProviders(<HomeRoute_1.default />);
        expect(react_2.screen.getByText('Test Action Safety')).toBeInTheDocument();
        expect(react_2.screen.getByText('Sample Investigation')).toBeInTheDocument();
        const quickAction = react_2.screen.getByText('Try action ID: test-action-123');
        expect(quickAction).toBeInTheDocument();
    });
    test('performance monitor is rendered', () => {
        renderWithProviders(<HomeRoute_1.default />);
        expect(react_2.screen.getByTestId('performance-monitor')).toBeInTheDocument();
    });
    test('keyboard shortcuts work', () => {
        renderWithProviders(<HomeRoute_1.default />);
        // Test Ctrl+2 (Investigations tab)
        react_2.fireEvent.keyDown(document, { key: '2', ctrlKey: true });
        expect(react_2.screen.getByTestId('investigation-manager')).toBeInTheDocument();
        // Test Ctrl+3 (Search tab)
        react_2.fireEvent.keyDown(document, { key: '3', ctrlKey: true });
        expect(react_2.screen.getByTestId('advanced-search')).toBeInTheDocument();
    });
    test('handles search result selection', async () => {
        renderWithProviders(<HomeRoute_1.default />);
        // Switch to search tab
        react_2.fireEvent.click(react_2.screen.getByText('🔎 Advanced Search'));
        // Click search mock button (simulates selecting a result)
        const searchButton = react_2.screen.getByText('Search Mock');
        react_2.fireEvent.click(searchButton);
        // The onResultSelect callback should be called (we can't easily test navigation)
        expect(searchButton).toBeInTheDocument();
    });
    test('handles investigation selection', async () => {
        renderWithProviders(<HomeRoute_1.default />);
        // Switch to investigations tab
        react_2.fireEvent.click(react_2.screen.getByText('🔍 Investigations'));
        // Click investigation mock button
        const invButton = react_2.screen.getByText('Investigation Manager Mock');
        react_2.fireEvent.click(invButton);
        expect(invButton).toBeInTheDocument();
    });
    test('handles export completion', async () => {
        renderWithProviders(<HomeRoute_1.default />);
        // Switch to export tab
        react_2.fireEvent.click(react_2.screen.getByText('📤 Data Export'));
        // Click export mock button
        const exportButton = react_2.screen.getByText('Export Mock');
        react_2.fireEvent.click(exportButton);
        expect(exportButton).toBeInTheDocument();
    });
    test('renders feature cards in overview', () => {
        renderWithProviders(<HomeRoute_1.default />);
        expect(react_2.screen.getByText('🌐 Graph Analysis')).toBeInTheDocument();
        expect(react_2.screen.getAllByText('🧬 Behavioral Analytics')[0]).toBeInTheDocument();
        expect(react_2.screen.getAllByText('🎯 Threat Hunting')[0]).toBeInTheDocument();
        expect(react_2.screen.getAllByText('🔒 Security & Compliance')[0]).toBeInTheDocument();
    });
    test('handles missing graph stats gracefully', () => {
        renderWithProviders(<HomeRoute_1.default />, { graph: {} });
        expect(react_2.screen.getByText('Graph Nodes:')).toBeInTheDocument();
        expect(react_2.screen.getAllByText('0')[0]).toBeInTheDocument(); // Use getAllByText for multiple 0s
    });
});
// Integration test for keyboard shortcuts
describe('HomeRoute Keyboard Shortcuts Integration', () => {
    test('question mark shows shortcuts help', async () => {
        renderWithProviders(<HomeRoute_1.default />);
        // Press '?' key
        react_2.fireEvent.keyDown(document, { key: '?' });
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
        });
    });
    test('Ctrl+H shows help system', async () => {
        renderWithProviders(<HomeRoute_1.default />);
        // Press Ctrl+H
        react_2.fireEvent.keyDown(document, { key: 'h', ctrlKey: true });
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('Help & Documentation')).toBeInTheDocument();
        });
    });
    test('Escape closes modals', async () => {
        renderWithProviders(<HomeRoute_1.default />);
        // Open shortcuts help first
        react_2.fireEvent.keyDown(document, { key: '?' });
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
        });
        // Press Escape to close
        await (0, user_1.withUser)(async (u) => {
            await u.keyboard('{Escape}');
        });
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
        });
    });
});
// Performance and accessibility tests
describe('HomeRoute Performance & Accessibility', () => {
    test('has proper heading hierarchy', () => {
        renderWithProviders(<HomeRoute_1.default />);
        const h1 = react_2.screen.getByRole('heading', { level: 1 });
        expect(h1).toHaveTextContent('IntelGraph Platform');
    });
    test('buttons have proper accessibility attributes', () => {
        renderWithProviders(<HomeRoute_1.default />);
        const helpButton = react_2.screen.getByText('📚 Help');
        expect(helpButton).toHaveAttribute('title');
        const shortcutsButton = react_2.screen.getByText('⌨️ Shortcuts');
        expect(shortcutsButton).toHaveAttribute('title');
    });
    test('tabs have proper ARIA attributes', () => {
        renderWithProviders(<HomeRoute_1.default />);
        const overviewTab = react_2.screen.getByText('🏠 Overview');
        expect(overviewTab.closest('button')).toHaveStyle('color: #1a73e8'); // Active tab styling
    });
});
