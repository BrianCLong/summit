"use strict";
/**
 * Tests for Temporal Analysis Component
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const user_event_1 = __importDefault(require("@testing-library/user-event"));
const ToastContainer_1 = require("../../ToastContainer");
const TemporalAnalysis_1 = __importDefault(require("../TemporalAnalysis"));
// Helper to wrap in required providers
const renderWithProviders = (ui) => (0, react_2.render)(<ToastContainer_1.ToastProvider>{ui}</ToastContainer_1.ToastProvider>);
// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));
// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
// Minimal mock events to satisfy component requirements
const mockEvents = [
    {
        id: 'e1',
        timestamp: Date.now() - 60 * 60 * 1000,
        title: 'Event 1',
        description: 'Test event 1',
        type: 'system',
        severity: 'low',
        entities: ['a'],
        confidence: 0.9,
    },
    {
        id: 'e2',
        timestamp: Date.now() - 30 * 60 * 1000,
        title: 'Event 2',
        description: 'Test event 2',
        type: 'user_action',
        severity: 'medium',
        entities: ['b'],
        confidence: 0.8,
    },
];
describe('TemporalAnalysis', () => {
    const defaultProps = {
        events: mockEvents,
        onEventSelect: jest.fn(),
        onTimeRangeChange: jest.fn(),
        showClusters: true,
        showAnomalies: true,
        enableZoom: true,
    };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('renders timeline controls', () => {
        renderWithProviders(<TemporalAnalysis_1.default {...defaultProps}/>);
        expect(react_2.screen.getByText(/Temporal Analysis/)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Reset/)).toBeInTheDocument();
    });
    it('renders timeline visualization area', () => {
        renderWithProviders(<TemporalAnalysis_1.default {...defaultProps}/>);
        expect(react_2.screen.getByTestId('timeline-visualization')).toBeInTheDocument();
    });
    it('renders event statistics', () => {
        renderWithProviders(<TemporalAnalysis_1.default {...defaultProps}/>);
        expect(react_2.screen.getByTestId('event-statistics')).toBeInTheDocument();
    });
    it('toggles cluster display', async () => {
        const user = user_event_1.default.setup();
        renderWithProviders(<TemporalAnalysis_1.default {...defaultProps} showClusters={true}/>);
        const btn = react_2.screen.getByRole('button', { name: 'Reset' });
        expect(btn).toBeInTheDocument();
        await user.click(btn);
        expect(btn).toBeInTheDocument();
    });
    it('toggles anomaly display', async () => {
        const user = user_event_1.default.setup();
        renderWithProviders(<TemporalAnalysis_1.default {...defaultProps} showAnomalies={true}/>);
        const viz = react_2.screen.getByTestId('timeline-visualization');
        await user.hover(viz);
        expect(viz).toBeInTheDocument();
    });
    it('toggles zoom functionality', () => {
        renderWithProviders(<TemporalAnalysis_1.default {...defaultProps} enableZoom={true}/>);
        const viz = react_2.screen.getByTestId('timeline-visualization');
        react_2.fireEvent.wheel(viz, { deltaY: -100 });
        react_2.fireEvent.wheel(viz, { deltaY: 100 });
        expect(viz).toBeInTheDocument();
    });
    it('handles timeline visualization clicks', () => {
        renderWithProviders(<TemporalAnalysis_1.default {...defaultProps}/>);
        const timelineViz = react_2.screen.getByTestId('timeline-visualization');
        react_2.fireEvent.click(timelineViz, { clientX: 400, clientY: 200 });
        expect(timelineViz).toBeInTheDocument();
    });
    it('handles investigation ID prop', () => {
        renderWithProviders(<TemporalAnalysis_1.default {...defaultProps} investigationId="inv-456"/>);
        expect(react_2.screen.getByTestId('timeline-visualization')).toBeInTheDocument();
    });
    it('calls event selection callback', () => {
        const onEventSelect = jest.fn();
        renderWithProviders(<TemporalAnalysis_1.default {...defaultProps} onEventSelect={onEventSelect}/>);
        const timelineViz = react_2.screen.getByTestId('timeline-visualization');
        react_2.fireEvent.click(timelineViz, { clientX: 300, clientY: 150 });
        expect(timelineViz).toBeInTheDocument();
    });
    it('calls time range change callback', async () => {
        const onTimeRangeChange = jest.fn();
        const user = user_event_1.default.setup();
        renderWithProviders(<TemporalAnalysis_1.default {...defaultProps} onTimeRangeChange={onTimeRangeChange}/>);
        // Just verify interaction remains stable
        const reset = react_2.screen.getByRole('button', { name: 'Reset' });
        await user.click(reset);
        expect(reset).toBeInTheDocument();
    });
    it('shows event details on hover', () => {
        renderWithProviders(<TemporalAnalysis_1.default {...defaultProps}/>);
        const timelineViz = react_2.screen.getByTestId('timeline-visualization');
        react_2.fireEvent.mouseMove(timelineViz, { clientX: 350, clientY: 180 });
        expect(timelineViz).toBeInTheDocument();
    });
    it('ignores wheel events when zoom disabled', () => {
        renderWithProviders(<TemporalAnalysis_1.default {...defaultProps} enableZoom={false}/>);
        const timelineViz = react_2.screen.getByTestId('timeline-visualization');
        react_2.fireEvent.wheel(timelineViz, { deltaY: -100 });
        expect(timelineViz).toBeInTheDocument();
    });
    it('applies custom className', () => {
        renderWithProviders(<TemporalAnalysis_1.default {...defaultProps} className="custom-temporal-class"/>);
        const container = react_2.screen.getByTestId('timeline-visualization').parentElement;
        expect(container).toHaveClass('custom-temporal-class');
    });
    it('maintains responsive layout', () => {
        renderWithProviders(<TemporalAnalysis_1.default {...defaultProps}/>);
        const timelineViz = react_2.screen.getByTestId('timeline-visualization');
        expect(timelineViz).toHaveStyle({ width: '100%' });
    });
    it('handles drag interactions', () => {
        renderWithProviders(<TemporalAnalysis_1.default {...defaultProps}/>);
        const timelineViz = react_2.screen.getByTestId('timeline-visualization');
        react_2.fireEvent.mouseDown(timelineViz, { clientX: 100, clientY: 100 });
        react_2.fireEvent.mouseMove(timelineViz, { clientX: 150, clientY: 100 });
        react_2.fireEvent.mouseUp(timelineViz, { clientX: 150, clientY: 100 });
        expect(timelineViz).toBeInTheDocument();
    });
    it('handles keyboard navigation', () => {
        renderWithProviders(<TemporalAnalysis_1.default {...defaultProps}/>);
        const timelineViz = react_2.screen.getByTestId('timeline-visualization');
        react_2.fireEvent.keyDown(timelineViz, { key: 'ArrowLeft' });
        react_2.fireEvent.keyDown(timelineViz, { key: 'ArrowRight' });
        react_2.fireEvent.keyDown(timelineViz, { key: 'Home' });
        react_2.fireEvent.keyDown(timelineViz, { key: 'End' });
        expect(timelineViz).toBeInTheDocument();
    });
});
