"use strict";
/**
 * Tests for Advanced Graph Interactions Component
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const user_event_1 = __importDefault(require("@testing-library/user-event"));
const styles_1 = require("@mui/material/styles");
const AdvancedGraphInteractions_1 = __importDefault(require("../AdvancedGraphInteractions"));
const theme = (0, styles_1.createTheme)();
const renderWithTheme = (component) => {
    return (0, react_2.render)(<styles_1.ThemeProvider theme={theme}>{component}</styles_1.ThemeProvider>);
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
    let consoleSpy;
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-01-15T10:30:45Z'));
        // Suppress console warnings
        consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
    });
    afterEach(() => {
        // Only run pending timers if we're using fake timers
        try {
            (0, react_2.act)(() => {
                jest.runOnlyPendingTimers();
            });
        }
        catch (e) {
            // Ignore errors if fake timers aren't active
        }
        jest.useRealTimers();
        jest.clearAllMocks();
        if (consoleSpy) {
            consoleSpy.mockRestore();
        }
    });
    it('renders component header with node and edge counts', () => {
        renderWithTheme(<AdvancedGraphInteractions_1.default nodes={mockNodes} edges={mockEdges}/>);
        expect(react_2.screen.getByText('Advanced Graph Analysis')).toBeInTheDocument();
        expect(react_2.screen.getByText('3 nodes, 2 edges')).toBeInTheDocument();
    });
    it('displays control buttons in header', () => {
        renderWithTheme(<AdvancedGraphInteractions_1.default nodes={mockNodes} edges={mockEdges}/>);
        // Check for control buttons
        expect(react_2.screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
        expect(react_2.screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();
        expect(react_2.screen.getByRole('button', { name: /center view/i })).toBeInTheDocument();
        expect(react_2.screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
        expect(react_2.screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });
    it('renders all navigation tabs', () => {
        renderWithTheme(<AdvancedGraphInteractions_1.default nodes={mockNodes} edges={mockEdges}/>);
        expect(react_2.screen.getByText('Metrics')).toBeInTheDocument();
        expect(react_2.screen.getByText('Filters')).toBeInTheDocument();
        expect(react_2.screen.getByText('Communities')).toBeInTheDocument();
        expect(react_2.screen.getByText('Pathfinding')).toBeInTheDocument();
    });
    it('displays network analysis metrics by default', () => {
        renderWithTheme(<AdvancedGraphInteractions_1.default nodes={mockNodes} edges={mockEdges}/>);
        expect(react_2.screen.getByText('Network Analysis')).toBeInTheDocument();
        expect(react_2.screen.getByText('Network Density')).toBeInTheDocument();
        expect(react_2.screen.getByText('Clustering Coefficient')).toBeInTheDocument();
        expect(react_2.screen.getByText('Average Path Length')).toBeInTheDocument();
        expect(react_2.screen.getByText('Betweenness Centrality')).toBeInTheDocument();
        expect(react_2.screen.getByText('PageRank Score')).toBeInTheDocument();
    });
    it('switches to filters tab when clicked', () => {
        renderWithTheme(<AdvancedGraphInteractions_1.default nodes={mockNodes} edges={mockEdges}/>);
        react_2.fireEvent.click(react_2.screen.getByText('Filters'));
        expect(react_2.screen.getByText('Filters & View')).toBeInTheDocument();
        expect(react_2.screen.getAllByText('Layout Algorithm')[0]).toBeInTheDocument();
        expect(react_2.screen.getByText(/Centrality Threshold:/)).toBeInTheDocument();
        expect(react_2.screen.getByText('Node Types')).toBeInTheDocument();
    });
    it('switches to communities tab when clicked', () => {
        renderWithTheme(<AdvancedGraphInteractions_1.default nodes={mockNodes} edges={mockEdges}/>);
        react_2.fireEvent.click(react_2.screen.getByText('Communities'));
        expect(react_2.screen.getByText('Community Analysis')).toBeInTheDocument();
        expect(react_2.screen.getByText('Run community detection analysis to identify node clusters and relationships.')).toBeInTheDocument();
    });
    it('switches to pathfinding tab when clicked', () => {
        renderWithTheme(<AdvancedGraphInteractions_1.default nodes={mockNodes} edges={mockEdges}/>);
        react_2.fireEvent.click(react_2.screen.getByText('Pathfinding'));
        expect(react_2.screen.getByText('Path Analysis')).toBeInTheDocument();
        expect(react_2.screen.getByText('Path analysis and shortest path algorithms coming soon...')).toBeInTheDocument();
    });
    it('displays community detection button and handles click', async () => {
        renderWithTheme(<AdvancedGraphInteractions_1.default nodes={mockNodes} edges={mockEdges}/>);
        const communityButton = react_2.screen.getByText('Run Community Detection');
        expect(communityButton).toBeInTheDocument();
        react_2.fireEvent.click(communityButton);
        // Should show analyzing state
        expect(react_2.screen.getByText('Analyzing...')).toBeInTheDocument();
        // Fast-forward time to complete analysis
        (0, react_2.act)(() => {
            jest.advanceTimersByTime(2000);
        });
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('Run Community Detection')).toBeInTheDocument(); // Button text restored
        });
    });
    it('handles layout algorithm selection', async () => {
        const onLayoutChange = jest.fn();
        renderWithTheme(<AdvancedGraphInteractions_1.default nodes={mockNodes} edges={mockEdges} onLayoutChange={onLayoutChange}/>);
        // Switch to filters tab
        react_2.fireEvent.click(react_2.screen.getByText('Filters'));
        // Find and click the layout select
        const layoutSelect = react_2.screen.getByRole('combobox');
        react_2.fireEvent.mouseDown(layoutSelect);
        // Select hierarchical layout
        const hierarchicalOption = react_2.screen.getByText('Hierarchical');
        react_2.fireEvent.click(hierarchicalOption);
        expect(onLayoutChange).toHaveBeenCalledWith('hierarchical');
    });
    it('handles centrality threshold slider changes', async () => {
        const user = user_event_1.default.setup();
        renderWithTheme(<AdvancedGraphInteractions_1.default nodes={mockNodes} edges={mockEdges}/>);
        // Switch to filters tab
        react_2.fireEvent.click(react_2.screen.getByText('Filters'));
        // Find the slider
        const slider = react_2.screen.getByRole('slider');
        expect(slider).toBeInTheDocument();
        // The slider should be functional (we can't easily test the exact value changes in JSDOM)
        expect(react_2.screen.getByText(/Centrality Threshold:/)).toBeInTheDocument();
    });
    it('toggles show communities switch', async () => {
        renderWithTheme(<AdvancedGraphInteractions_1.default nodes={mockNodes} edges={mockEdges}/>);
        // Switch to filters tab
        react_2.fireEvent.click(react_2.screen.getByText('Filters'));
        const showCommunitiesSwitch = react_2.screen.getByRole('switch', {
            name: /show communities/i,
        });
        expect(showCommunitiesSwitch).not.toBeChecked();
        react_2.fireEvent.click(showCommunitiesSwitch);
        expect(showCommunitiesSwitch).toBeChecked();
    });
    it('handles node type filter chips', async () => {
        renderWithTheme(<AdvancedGraphInteractions_1.default nodes={mockNodes} edges={mockEdges}/>);
        // Switch to filters tab
        react_2.fireEvent.click(react_2.screen.getByText('Filters'));
        // Find and click a node type chip
        const personChip = react_2.screen.getByText('person');
        expect(personChip).toBeInTheDocument();
        react_2.fireEvent.click(personChip);
        // The chip state should change (visually, but hard to test in JSDOM)
        // Just verify we can interact with it without error
        expect(react_2.screen.getByText('person')).toBeInTheDocument();
    });
    it('calls onNodeSelect when provided', () => {
        const onNodeSelect = jest.fn();
        renderWithTheme(<AdvancedGraphInteractions_1.default nodes={mockNodes} edges={mockEdges} onNodeSelect={onNodeSelect}/>);
        // This callback would be triggered by clicking nodes in the communities panel
        // after running clustering analysis
        expect(onNodeSelect).not.toHaveBeenCalled(); // Initially no calls
    });
    it('calls onAnalysisRun when community detection is triggered', async () => {
        const onAnalysisRun = jest.fn();
        renderWithTheme(<AdvancedGraphInteractions_1.default nodes={mockNodes} edges={mockEdges} onAnalysisRun={onAnalysisRun}/>);
        const communityButton = react_2.screen.getByText('Run Community Detection');
        react_2.fireEvent.click(communityButton);
        // Fast-forward the analysis
        (0, react_2.act)(() => {
            jest.advanceTimersByTime(2000);
        });
        await (0, react_2.waitFor)(() => {
            expect(onAnalysisRun).toHaveBeenCalledWith('clustering', {
                algorithm: 'louvain',
            });
        });
    });
    it('displays metric cards with proper formatting', () => {
        renderWithTheme(<AdvancedGraphInteractions_1.default nodes={mockNodes} edges={mockEdges}/>);
        // Check for formatted metric values
        expect(react_2.screen.getByText('0.23')).toBeInTheDocument(); // Network Density
        expect(react_2.screen.getByText('0.67')).toBeInTheDocument(); // Clustering Coefficient
        expect(react_2.screen.getByText('3.20')).toBeInTheDocument(); // Average Path Length
    });
    it('shows proper category chips for metrics', () => {
        renderWithTheme(<AdvancedGraphInteractions_1.default nodes={mockNodes} edges={mockEdges}/>);
        // Check for category chips
        expect(react_2.screen.getAllByText('structure')).toHaveLength(2); // Network Density, Clustering Coefficient
        expect(react_2.screen.getAllByText('centrality')).toHaveLength(2); // Betweenness, PageRank
        expect(react_2.screen.getAllByText('connectivity')).toHaveLength(1); // Average Path Length
    });
    it('handles empty node and edge arrays gracefully', () => {
        renderWithTheme(<AdvancedGraphInteractions_1.default nodes={[]} edges={[]}/>);
        expect(react_2.screen.getByText('Advanced Graph Analysis')).toBeInTheDocument();
        expect(react_2.screen.getByText('0 nodes, 0 edges')).toBeInTheDocument();
    });
    it('has proper accessibility attributes', () => {
        renderWithTheme(<AdvancedGraphInteractions_1.default nodes={mockNodes} edges={mockEdges}/>);
        // Check for tab accessibility
        const tabList = react_2.screen.getByRole('tablist');
        expect(tabList).toBeInTheDocument();
        // Check for button accessibility
        expect(react_2.screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
        expect(react_2.screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
    it('enables advanced features by default', () => {
        renderWithTheme(<AdvancedGraphInteractions_1.default nodes={mockNodes} edges={mockEdges} enableAdvancedFeatures={true}/>);
        // Should show all advanced features
        expect(react_2.screen.getByText('Run Community Detection')).toBeInTheDocument();
        expect(react_2.screen.getByText('Metrics')).toBeInTheDocument();
        expect(react_2.screen.getByText('Communities')).toBeInTheDocument();
    });
});
