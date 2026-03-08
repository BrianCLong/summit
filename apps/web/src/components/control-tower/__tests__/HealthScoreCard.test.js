"use strict";
/**
 * HealthScoreCard Component Tests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const vitest_1 = require("vitest");
const react_2 = require("@testing-library/react");
const material_1 = require("@mui/material");
const HealthScoreCard_1 = require("../HealthScoreCard");
const theme = (0, material_1.createTheme)();
const renderWithTheme = (component) => {
    return (0, react_2.render)(<material_1.ThemeProvider theme={theme}>{component}</material_1.ThemeProvider>);
};
(0, vitest_1.describe)('HealthScoreCard', () => {
    const defaultProps = {
        score: 87,
        trend: 'UP',
        change: 3,
        components: [
            { name: 'Support', score: 92, status: 'HEALTHY' },
            { name: 'Revenue', score: 85, status: 'WARNING' },
            { name: 'Product', score: 88, status: 'HEALTHY' },
            { name: 'Team', score: 83, status: 'WARNING' },
        ],
    };
    (0, vitest_1.it)('should render the health score', () => {
        renderWithTheme(<HealthScoreCard_1.HealthScoreCard {...defaultProps}/>);
        (0, vitest_1.expect)(react_2.screen.getByText('87')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('/100')).toBeInTheDocument();
    });
    (0, vitest_1.it)('should render the title', () => {
        renderWithTheme(<HealthScoreCard_1.HealthScoreCard {...defaultProps}/>);
        (0, vitest_1.expect)(react_2.screen.getByText('Operational Health Score')).toBeInTheDocument();
    });
    (0, vitest_1.it)('should render all component scores', () => {
        renderWithTheme(<HealthScoreCard_1.HealthScoreCard {...defaultProps}/>);
        (0, vitest_1.expect)(react_2.screen.getByText('Support:')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('92')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('Revenue:')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('85')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('Product:')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('88')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('Team:')).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText('83')).toBeInTheDocument();
    });
    (0, vitest_1.it)('should display positive change with plus sign', () => {
        renderWithTheme(<HealthScoreCard_1.HealthScoreCard {...defaultProps}/>);
        (0, vitest_1.expect)(react_2.screen.getByText('+3 from yesterday')).toBeInTheDocument();
    });
    (0, vitest_1.it)('should display negative change', () => {
        renderWithTheme(<HealthScoreCard_1.HealthScoreCard {...defaultProps} change={-5} trend="DOWN"/>);
        (0, vitest_1.expect)(react_2.screen.getByText('-5 from yesterday')).toBeInTheDocument();
    });
    (0, vitest_1.it)('should render loading state', () => {
        renderWithTheme(<HealthScoreCard_1.HealthScoreCard {...defaultProps} isLoading/>);
        // Should not show the score when loading
        (0, vitest_1.expect)(react_2.screen.queryByText('87')).not.toBeInTheDocument();
    });
    (0, vitest_1.it)('should handle zero score', () => {
        renderWithTheme(<HealthScoreCard_1.HealthScoreCard {...defaultProps} score={0}/>);
        (0, vitest_1.expect)(react_2.screen.getByText('0')).toBeInTheDocument();
    });
    (0, vitest_1.it)('should handle empty components array', () => {
        renderWithTheme(<HealthScoreCard_1.HealthScoreCard {...defaultProps} components={[]}/>);
        (0, vitest_1.expect)(react_2.screen.getByText('87')).toBeInTheDocument();
    });
});
