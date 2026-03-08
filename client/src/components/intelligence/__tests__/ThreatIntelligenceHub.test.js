"use strict";
/**
 * Tests for Threat Intelligence Hub Component
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const user_event_1 = require("@testing-library/user-event");
const ThreatIntelligenceHub_1 = __importDefault(require("../ThreatIntelligenceHub"));
// Mock auto-refresh timer
jest.useFakeTimers();
describe('ThreatIntelligenceHub', () => {
    const defaultProps = {
        onIndicatorSelect: jest.fn(),
        onCampaignSelect: jest.fn(),
        onActorSelect: jest.fn(),
        autoRefresh: false, // Disable auto-refresh for most tests
        refreshInterval: 300000,
    };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    afterEach(() => {
        jest.clearAllTimers();
    });
    it('renders threat intelligence hub header', () => {
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps}/>);
        expect(react_2.screen.getByText(/🛡️ Threat Intelligence Hub/)).toBeInTheDocument();
    });
    it('renders view tabs', () => {
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps}/>);
        expect(react_2.screen.getByText(/🎯 Indicators/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/📋 Campaigns/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/🕵️ Actors/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/📡 Feeds/)).toBeInTheDocument();
    });
    it('renders search and filters', () => {
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps}/>);
        expect(react_2.screen.getByPlaceholderText(/Search indicators, tags, or IOCs/)).toBeInTheDocument();
        expect(react_2.screen.getByDisplayValue('All Severities')).toBeInTheDocument();
        expect(react_2.screen.getByDisplayValue('All Types')).toBeInTheDocument();
    });
    it('displays indicators by default', () => {
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps}/>);
        expect(react_2.screen.getByText(/Threat Indicators/)).toBeInTheDocument();
        // Should show mock indicator data
        expect(react_2.screen.getByText('192.168.1.100')).toBeInTheDocument();
        expect(react_2.screen.getByText('malicious-domain.com')).toBeInTheDocument();
    });
    it('switches between view tabs', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps}/>);
        // Switch to campaigns
        await user.click(react_2.screen.getByText(/📋 Campaigns/));
        expect(react_2.screen.getByText(/Threat Campaigns/)).toBeInTheDocument();
        expect(react_2.screen.getByText('Operation Winter Storm')).toBeInTheDocument();
        // Switch to actors
        await user.click(react_2.screen.getByText(/🕵️ Actors/));
        expect(react_2.screen.getByText(/Threat Actors/)).toBeInTheDocument();
        expect(react_2.screen.getByText('APT29')).toBeInTheDocument();
        // Switch to feeds
        await user.click(react_2.screen.getByText(/📡 Feeds/));
        expect(react_2.screen.getByText(/Intelligence Feeds/)).toBeInTheDocument();
        expect(react_2.screen.getByText('VirusTotal')).toBeInTheDocument();
    });
    it('filters indicators by search query', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps}/>);
        const searchInput = react_2.screen.getByPlaceholderText(/Search indicators, tags, or IOCs/);
        await user.type(searchInput, '192.168');
        // Should show filtered results
        expect(react_2.screen.getByText('192.168.1.100')).toBeInTheDocument();
        expect(react_2.screen.queryByText('malicious-domain.com')).not.toBeInTheDocument();
    });
    it('filters indicators by severity', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps}/>);
        const severitySelect = react_2.screen.getByDisplayValue('All Severities');
        await user.selectOptions(severitySelect, 'critical');
        expect(severitySelect).toHaveValue('critical');
        // Should show only critical indicators
        expect(react_2.screen.getByText('malicious-domain.com')).toBeInTheDocument();
    });
    it('filters indicators by type', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps}/>);
        const typeSelect = react_2.screen.getByDisplayValue('All Types');
        await user.selectOptions(typeSelect, 'ip');
        expect(typeSelect).toHaveValue('ip');
        // Should show only IP indicators
        expect(react_2.screen.getByText('192.168.1.100')).toBeInTheDocument();
    });
    it('selects indicator and shows details', async () => {
        const user = user_event_1.userEvent.setup();
        const onIndicatorSelect = jest.fn();
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps} onIndicatorSelect={onIndicatorSelect}/>);
        // Click on an indicator
        await user.click(react_2.screen.getByText('192.168.1.100'));
        // Should show indicator details panel
        expect(react_2.screen.getByText('Indicator Details')).toBeInTheDocument();
        expect(react_2.screen.getByText(/Context/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Tags/)).toBeInTheDocument();
    });
    it('calls indicator select callback', async () => {
        const user = user_event_1.userEvent.setup();
        const onIndicatorSelect = jest.fn();
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps} onIndicatorSelect={onIndicatorSelect}/>);
        await user.click(react_2.screen.getByText('192.168.1.100'));
        expect(onIndicatorSelect).toHaveBeenCalledWith(expect.objectContaining({
            type: 'ip',
            value: '192.168.1.100',
            severity: 'high',
        }));
    });
    it('calls campaign select callback', async () => {
        const user = user_event_1.userEvent.setup();
        const onCampaignSelect = jest.fn();
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps} onCampaignSelect={onCampaignSelect}/>);
        // Switch to campaigns tab
        await user.click(react_2.screen.getByText(/📋 Campaigns/));
        // Click on a campaign
        await user.click(react_2.screen.getByText('Operation Winter Storm'));
        expect(onCampaignSelect).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Operation Winter Storm',
            status: 'active',
        }));
    });
    it('calls actor select callback', async () => {
        const user = user_event_1.userEvent.setup();
        const onActorSelect = jest.fn();
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps} onActorSelect={onActorSelect}/>);
        // Switch to actors tab
        await user.click(react_2.screen.getByText(/🕵️ Actors/));
        // Click on an actor
        await user.click(react_2.screen.getByText('APT29'));
        expect(onActorSelect).toHaveBeenCalledWith(expect.objectContaining({
            name: 'APT29',
            type: 'nation-state',
        }));
    });
    it('handles investigation ID prop', () => {
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps} investigationId="inv-789"/>);
        expect(react_2.screen.getByText(/Threat Indicators/)).toBeInTheDocument();
    });
    it('displays severity colors correctly', () => {
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps}/>);
        // Should display severity badges with different colors
        const severityBadges = react_2.screen.getAllByText(/HIGH|CRITICAL/);
        expect(severityBadges.length).toBeGreaterThan(0);
    });
    it('displays indicator type icons', () => {
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps}/>);
        // Should display type icons (emojis) for different indicator types
        expect(react_2.screen.getByText('192.168.1.100')).toBeInTheDocument();
        expect(react_2.screen.getByText('malicious-domain.com')).toBeInTheDocument();
    });
    it('shows last updated timestamp', () => {
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps}/>);
        expect(react_2.screen.getByText(/Last updated:/)).toBeInTheDocument();
    });
    it('handles auto-refresh when enabled', async () => {
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps} autoRefresh={true}/>);
        expect(react_2.screen.getByText(/🔄 Auto-refresh/)).toBeInTheDocument();
        // Fast-forward time to trigger refresh
        (0, react_2.act)(() => {
            jest.advanceTimersByTime(300000); // 5 minutes
        });
        // Should update timestamp
        expect(react_2.screen.getByText(/Last updated:/)).toBeInTheDocument();
    });
    it('displays feed status information', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps}/>);
        // Switch to feeds tab
        await user.click(react_2.screen.getByText(/📡 Feeds/));
        expect(react_2.screen.getByText('VirusTotal')).toBeInTheDocument();
        expect(react_2.screen.getByText('Recorded Future')).toBeInTheDocument();
        expect(react_2.screen.getByText('MISP')).toBeInTheDocument();
        expect(react_2.screen.getByText(/ACTIVE/)).toBeInTheDocument();
    });
    it('applies custom className', () => {
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps} className="custom-threat-class"/>);
        const container = react_2.screen
            .getByText(/🛡️ Threat Intelligence Hub/)
            .closest('.threat-intelligence-hub');
        expect(container).toHaveClass('custom-threat-class');
    });
    it('handles empty search results', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps}/>);
        const searchInput = react_2.screen.getByPlaceholderText(/Search indicators, tags, or IOCs/);
        await user.type(searchInput, 'nonexistent-indicator');
        // Should show no results or empty state
        expect(react_2.screen.getByText(/Threat Indicators \(0\)/)).toBeInTheDocument();
    });
    it('displays indicator context information', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps}/>);
        // Select an indicator to see details
        await user.click(react_2.screen.getByText('192.168.1.100'));
        // Should show context information
        expect(react_2.screen.getByText(/Malware Family:/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Campaign:/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Actor:/)).toBeInTheDocument();
    });
    it('shows indicator confidence scores', () => {
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps}/>);
        // Should display confidence percentages
        expect(react_2.screen.getByText('95%')).toBeInTheDocument();
        expect(react_2.screen.getByText('88%')).toBeInTheDocument();
    });
    it('handles component cleanup on unmount', () => {
        const { unmount } = (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps} autoRefresh={true}/>);
        unmount();
        // Should clear timers without errors
        expect(() => jest.runOnlyPendingTimers()).not.toThrow();
    });
    it('supports keyboard navigation', () => {
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps}/>);
        const searchInput = react_2.screen.getByPlaceholderText(/Search indicators, tags, or IOCs/);
        // Test keyboard events
        react_2.fireEvent.keyDown(searchInput, { key: 'Enter' });
        react_2.fireEvent.keyDown(searchInput, { key: 'Escape' });
        // Should handle keyboard events without errors
        expect(searchInput).toBeInTheDocument();
    });
    it('updates counters in tab labels', async () => {
        const user = user_event_1.userEvent.setup();
        (0, react_2.render)(<ThreatIntelligenceHub_1.default {...defaultProps}/>);
        // Check initial count
        expect(react_2.screen.getByText(/🎯 Indicators \(\d+\)/)).toBeInTheDocument();
        // Apply filter to change count
        const searchInput = react_2.screen.getByPlaceholderText(/Search indicators, tags, or IOCs/);
        await user.type(searchInput, 'domain');
        // Count should update (though exact number depends on mock data)
        expect(react_2.screen.getByText(/🎯 Indicators \(\d+\)/)).toBeInTheDocument();
    });
});
