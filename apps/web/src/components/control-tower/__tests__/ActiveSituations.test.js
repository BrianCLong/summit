"use strict";
/**
 * ActiveSituations Component Tests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const vitest_1 = require("vitest");
const react_2 = require("@testing-library/react");
const material_1 = require("@mui/material");
const ActiveSituations_1 = require("../ActiveSituations");
const theme = (0, material_1.createTheme)();
const renderWithTheme = (component) => {
    return (0, react_2.render)(<material_1.ThemeProvider theme={theme}>{component}</material_1.ThemeProvider>);
};
(0, vitest_1.describe)('ActiveSituations', () => {
    const mockSituations = [
        {
            id: '1',
            title: 'Payment Processing',
            priority: 'P1',
            severity: 'CRITICAL',
            eventCount: 3,
            startedAt: new Date(Date.now() - 23 * 60 * 1000),
            owner: { id: '1', name: 'mike' },
        },
        {
            id: '2',
            title: 'Support Volume Spike',
            priority: 'P2',
            severity: 'WARNING',
            eventCount: 12,
            startedAt: new Date(Date.now() - 45 * 60 * 1000),
        },
    ];
    (0, vitest_1.it)('should render the title with situation count', () => {
        renderWithTheme(<ActiveSituations_1.ActiveSituations situations={mockSituations} onSituationClick={() => { }}/>);
        (0, vitest_1.expect)(react_2.screen.getByText(/Active Situations \(2\)/)).toBeInTheDocument();
    });
    (0, vitest_1.it)('should render all situations', () => {
        renderWithTheme(<ActiveSituations_1.ActiveSituations situations={mockSituations} onSituationClick={() => { }}/>);
        (0, vitest_1.expect)(react_2.screen.getByText('Payment Processing')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('Support Volume Spike')).toBeInTheDocument();
    });
    (0, vitest_1.it)('should display priority chips', () => {
        renderWithTheme(<ActiveSituations_1.ActiveSituations situations={mockSituations} onSituationClick={() => { }}/>);
        (0, vitest_1.expect)(react_2.screen.getByText('P1')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('P2')).toBeInTheDocument();
    });
    (0, vitest_1.it)('should display event counts', () => {
        renderWithTheme(<ActiveSituations_1.ActiveSituations situations={mockSituations} onSituationClick={() => { }}/>);
        (0, vitest_1.expect)(react_2.screen.getByText(/3 related events/)).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText(/12 related events/)).toBeInTheDocument();
    });
    (0, vitest_1.it)('should display owner when assigned', () => {
        renderWithTheme(<ActiveSituations_1.ActiveSituations situations={mockSituations} onSituationClick={() => { }}/>);
        (0, vitest_1.expect)(react_2.screen.getByText(/Assigned: @mike/)).toBeInTheDocument();
    });
    (0, vitest_1.it)('should call onSituationClick when clicking a situation', () => {
        const handleClick = vitest_1.vi.fn();
        renderWithTheme(<ActiveSituations_1.ActiveSituations situations={mockSituations} onSituationClick={handleClick}/>);
        // Click on the View button
        const viewButtons = react_2.screen.getAllByText('View');
        react_2.fireEvent.click(viewButtons[0]);
        (0, vitest_1.expect)(handleClick).toHaveBeenCalledWith('1');
    });
    (0, vitest_1.it)('should render empty state when no situations', () => {
        renderWithTheme(<ActiveSituations_1.ActiveSituations situations={[]} onSituationClick={() => { }}/>);
        (0, vitest_1.expect)(react_2.screen.getByText(/No active situations/)).toBeInTheDocument();
    });
    (0, vitest_1.it)('should render loading state', () => {
        renderWithTheme(<ActiveSituations_1.ActiveSituations situations={[]} onSituationClick={() => { }} isLoading/>);
        // Should not show the empty state when loading
        (0, vitest_1.expect)(react_2.screen.queryByText(/No active situations/)).not.toBeInTheDocument();
    });
    (0, vitest_1.it)('should have create situation button', () => {
        renderWithTheme(<ActiveSituations_1.ActiveSituations situations={mockSituations} onSituationClick={() => { }}/>);
        (0, vitest_1.expect)(react_2.screen.getByText('+ Create Situation')).toBeInTheDocument();
    });
});
