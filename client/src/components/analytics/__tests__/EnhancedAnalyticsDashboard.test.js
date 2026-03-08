"use strict";
/**
 * Tests for Enhanced Analytics Dashboard Component
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const styles_1 = require("@mui/material/styles");
const EnhancedAnalyticsDashboard_1 = __importDefault(require("../EnhancedAnalyticsDashboard"));
const theme = (0, styles_1.createTheme)();
const renderWithTheme = (component) => {
    return (0, react_2.render)(<styles_1.ThemeProvider theme={theme}>{component}</styles_1.ThemeProvider>);
};
describe('EnhancedAnalyticsDashboard', () => {
    let consoleSpy;
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-01-15T10:30:45Z'));
        // Suppress MUI Grid warnings globally
        consoleSpy = jest.spyOn(console, 'warn').mockImplementation((message) => {
            if (!message.includes('MUI Grid')) {
                console.error(message);
            }
        });
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
    it('renders dashboard header with title and controls', () => {
        renderWithTheme(<EnhancedAnalyticsDashboard_1.default />);
        expect(react_2.screen.getByText('Analytics Dashboard')).toBeInTheDocument();
        expect(react_2.screen.getByText(/Last updated:/)).toBeInTheDocument();
        // Check control elements - find by the select role instead of label
        expect(react_2.screen.getByRole('combobox')).toBeInTheDocument();
        expect(react_2.screen.getByText('Real-time')).toBeInTheDocument();
        expect(react_2.screen.getByLabelText('Refresh Data')).toBeInTheDocument();
        expect(react_2.screen.getByLabelText('Export Data')).toBeInTheDocument();
        expect(react_2.screen.getByLabelText('Settings')).toBeInTheDocument();
    });
    it('displays metric cards with key metrics', () => {
        renderWithTheme(<EnhancedAnalyticsDashboard_1.default />);
        // Check for metric cards
        expect(react_2.screen.getByText('Total Entities')).toBeInTheDocument();
        expect(react_2.screen.getByText('Active Users')).toBeInTheDocument();
        expect(react_2.screen.getByText('Avg Query Time')).toBeInTheDocument();
        expect(react_2.screen.getByText('Data Quality Score')).toBeInTheDocument();
        expect(react_2.screen.getByText('Security Alerts')).toBeInTheDocument();
        expect(react_2.screen.getByText('API Calls/Hour')).toBeInTheDocument();
        // Check for formatted values
        expect(react_2.screen.getByText(/15,842/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/94\.2%/)).toBeInTheDocument();
    });
    it('shows real-time monitoring alert when enabled', () => {
        renderWithTheme(<EnhancedAnalyticsDashboard_1.default realTimeEnabled={true}/>);
        expect(react_2.screen.getByText('Real-time monitoring active')).toBeInTheDocument();
        expect(react_2.screen.getByText('Updates every 60s')).toBeInTheDocument();
    });
    it('renders time range selector with default value', () => {
        const onConfigChange = jest.fn();
        renderWithTheme(<EnhancedAnalyticsDashboard_1.default onConfigChange={onConfigChange}/>);
        // Verify the time range select is present
        const timeRangeSelect = react_2.screen.getByRole('combobox');
        expect(timeRangeSelect).toBeInTheDocument();
        // Verify it displays the default text (24h corresponds to "Last 24 Hours")
        expect(react_2.screen.getByText('Last 24 Hours')).toBeInTheDocument();
    });
    it('toggles real-time monitoring', async () => {
        const onConfigChange = jest.fn();
        renderWithTheme(<EnhancedAnalyticsDashboard_1.default onConfigChange={onConfigChange}/>);
        const realTimeSwitch = react_2.screen.getByRole('switch', { name: /real-time/i });
        expect(realTimeSwitch).toBeChecked();
        // Use fireEvent for more reliable test
        react_2.fireEvent.click(realTimeSwitch);
        expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({
            showRealTime: false,
        }));
    });
    it('handles refresh button click', async () => {
        renderWithTheme(<EnhancedAnalyticsDashboard_1.default />);
        const refreshButton = react_2.screen.getByLabelText('Refresh Data');
        react_2.fireEvent.click(refreshButton);
        // Should show loading state
        expect(react_2.screen.getByRole('progressbar')).toBeInTheDocument();
        // Advance timers to complete the loading
        (0, react_2.act)(() => {
            jest.advanceTimersByTime(1000);
        });
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });
    });
    it('renders navigation tabs and switches between them', async () => {
        renderWithTheme(<EnhancedAnalyticsDashboard_1.default />);
        // Check all tabs are present
        expect(react_2.screen.getByText('Overview')).toBeInTheDocument();
        expect(react_2.screen.getByText('Performance')).toBeInTheDocument();
        expect(react_2.screen.getByText('Usage')).toBeInTheDocument();
        expect(react_2.screen.getByText('Security')).toBeInTheDocument();
        // Click on Performance tab
        react_2.fireEvent.click(react_2.screen.getByText('Performance'));
        expect(react_2.screen.getByText('Performance analytics view coming soon...')).toBeInTheDocument();
        // Click on Usage tab
        react_2.fireEvent.click(react_2.screen.getByText('Usage'));
        expect(react_2.screen.getByText('Usage analytics view coming soon...')).toBeInTheDocument();
    });
    it('calls onExport when export button is clicked', async () => {
        const onExport = jest.fn();
        renderWithTheme(<EnhancedAnalyticsDashboard_1.default onExport={onExport}/>);
        const exportButton = react_2.screen.getByLabelText('Export Data');
        react_2.fireEvent.click(exportButton);
        expect(onExport).toHaveBeenCalledWith('csv');
    });
    it('shows appropriate category labels for metrics', () => {
        renderWithTheme(<EnhancedAnalyticsDashboard_1.default />);
        // Check that metrics have category chips
        expect(react_2.screen.getAllByText('usage')).toHaveLength(3);
        expect(react_2.screen.getAllByText('performance')).toHaveLength(1);
        expect(react_2.screen.getAllByText('quality')).toHaveLength(1);
        expect(react_2.screen.getAllByText('security')).toHaveLength(1);
    });
    it('handles loading states properly', async () => {
        renderWithTheme(<EnhancedAnalyticsDashboard_1.default />);
        const refreshButton = react_2.screen.getByLabelText('Refresh Data');
        react_2.fireEvent.click(refreshButton);
        // Should show loading progress bar
        expect(react_2.screen.getByRole('progressbar')).toBeInTheDocument();
        // Refresh button should be disabled during loading
        expect(refreshButton).toBeDisabled();
    });
    it('has proper accessibility attributes', () => {
        renderWithTheme(<EnhancedAnalyticsDashboard_1.default />);
        // Check for proper ARIA labels
        expect(react_2.screen.getByLabelText('Refresh Data')).toBeInTheDocument();
        expect(react_2.screen.getByLabelText('Export Data')).toBeInTheDocument();
        expect(react_2.screen.getByLabelText('Settings')).toBeInTheDocument();
        expect(react_2.screen.getByRole('combobox')).toBeInTheDocument();
        // Check that tabs have proper roles
        const tabList = react_2.screen.getByRole('tablist');
        expect(tabList).toBeInTheDocument();
    });
    it('formats metric values correctly', () => {
        renderWithTheme(<EnhancedAnalyticsDashboard_1.default />);
        // Check number formatting
        expect(react_2.screen.getByText(/15,842/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/94\.2%/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/245ms/)).toBeInTheDocument();
    });
});
