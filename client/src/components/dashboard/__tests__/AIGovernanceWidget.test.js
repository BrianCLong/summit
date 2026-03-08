"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const AIGovernanceWidget_1 = __importDefault(require("../AIGovernanceWidget"));
describe('AIGovernanceWidget', () => {
    it('renders the widget title', () => {
        (0, react_2.render)(<AIGovernanceWidget_1.default />);
        expect(react_2.screen.getByText('AI Governance & Agent Fleet')).toBeInTheDocument();
    });
    it('displays the automated validation rate chip', () => {
        (0, react_2.render)(<AIGovernanceWidget_1.default />);
        expect(react_2.screen.getByText('85% Automated')).toBeInTheDocument();
    });
    it('renders key metrics section', () => {
        (0, react_2.render)(<AIGovernanceWidget_1.default />);
        expect(react_2.screen.getByText('Policy Validation Rate')).toBeInTheDocument();
        expect(react_2.screen.getByText('Human Escalations')).toBeInTheDocument();
        expect(react_2.screen.getByText('Active Agents')).toBeInTheDocument();
        expect(react_2.screen.getByText('Avg Response Time')).toBeInTheDocument();
    });
    it('displays the 85% policy validation rate', () => {
        (0, react_2.render)(<AIGovernanceWidget_1.default />);
        expect(react_2.screen.getByText('85%')).toBeInTheDocument();
    });
    it('renders agent fleet status section', () => {
        (0, react_2.render)(<AIGovernanceWidget_1.default />);
        expect(react_2.screen.getByText('Agent Fleet Status')).toBeInTheDocument();
    });
    it('displays all mock fleet agents', () => {
        (0, react_2.render)(<AIGovernanceWidget_1.default />);
        expect(react_2.screen.getByText('Entity Extraction Fleet')).toBeInTheDocument();
        expect(react_2.screen.getByText('Relationship Inference Fleet')).toBeInTheDocument();
        expect(react_2.screen.getByText('Anomaly Detection Fleet')).toBeInTheDocument();
        expect(react_2.screen.getByText('OSINT Collector Fleet')).toBeInTheDocument();
    });
    it('shows agent status chips', () => {
        (0, react_2.render)(<AIGovernanceWidget_1.default />);
        expect(react_2.screen.getAllByText('ACTIVE').length).toBeGreaterThanOrEqual(1);
        expect(react_2.screen.getByText('PAUSED')).toBeInTheDocument();
        expect(react_2.screen.getByText('CONTAINED')).toBeInTheDocument();
    });
    it('displays containment warning when agents are contained', () => {
        (0, react_2.render)(<AIGovernanceWidget_1.default />);
        expect(react_2.screen.getByText(/agent\(s\) automatically contained/i)).toBeInTheDocument();
    });
    it('handles refresh button click', async () => {
        (0, react_2.render)(<AIGovernanceWidget_1.default />);
        const refreshButton = react_2.screen.getByRole('button', { name: /refresh/i });
        expect(refreshButton).not.toBeDisabled();
        react_2.fireEvent.click(refreshButton);
        // Button should be disabled while refreshing
        expect(refreshButton).toBeDisabled();
        // Wait for refresh to complete
        await (0, react_2.waitFor)(() => {
            expect(refreshButton).not.toBeDisabled();
        }, { timeout: 2000 });
    });
    it('displays compliance percentage for each agent', () => {
        (0, react_2.render)(<AIGovernanceWidget_1.default />);
        // Check for compliance labels
        const complianceLabels = react_2.screen.getAllByText('Compliance');
        expect(complianceLabels.length).toBe(4);
    });
    it('shows incident count for agents with incidents', () => {
        (0, react_2.render)(<AIGovernanceWidget_1.default />);
        expect(react_2.screen.getByText('1 incidents')).toBeInTheDocument();
        expect(react_2.screen.getByText('3 incidents')).toBeInTheDocument();
    });
    it('displays response time metric', () => {
        (0, react_2.render)(<AIGovernanceWidget_1.default />);
        expect(react_2.screen.getByText('47ms')).toBeInTheDocument();
    });
    it('renders with correct accessibility attributes', () => {
        (0, react_2.render)(<AIGovernanceWidget_1.default />);
        // Check that the widget is rendered as a card
        const card = react_2.screen.getByText('AI Governance & Agent Fleet').closest('.MuiCard-root');
        expect(card).toBeInTheDocument();
    });
});
