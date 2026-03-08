"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const TimelineRail_1 = require("./TimelineRail");
const vitest_1 = require("vitest");
const React = __importStar(require("react"));
// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};
// Mock Tooltip components
vitest_1.vi.mock('@/components/ui/Tooltip', () => {
    const React = require('react');
    return {
        TooltipProvider: ({ children }) => React.createElement('div', { 'data-testid': 'tooltip-provider' }, children),
        Tooltip: ({ children }) => React.createElement('div', { 'data-testid': 'tooltip' }, children),
        TooltipTrigger: ({ children }) => React.createElement('div', { 'data-testid': 'tooltip-trigger' }, children),
        TooltipContent: ({ children }) => React.createElement('div', { role: 'tooltip', hidden: true }, children),
    };
});
const mockEvents = [
    {
        id: '1',
        timestamp: '2023-01-01T10:00:00Z',
        type: 'entity_created',
        title: 'Entity Created',
        description: 'A new entity was created',
        metadata: {},
    },
    {
        id: '2',
        timestamp: '2023-01-01T12:00:00Z',
        type: 'alert_triggered',
        title: 'Alert Triggered',
        description: 'An alert was triggered',
        metadata: {},
    },
];
const defaultProps = {
    data: mockEvents,
    totalTimeRange: {
        start: new Date('2023-01-01T00:00:00Z'),
        end: new Date('2023-01-01T23:59:59Z'),
    },
    currentTime: new Date('2023-01-01T12:00:00Z'),
    onCurrentTimeChange: vitest_1.vi.fn(),
    onTimeRangeChange: vitest_1.vi.fn(),
    onEventSelect: vitest_1.vi.fn(),
};
(0, vitest_1.describe)('TimelineRail', () => {
    (0, vitest_1.it)('renders correctly', () => {
        (0, react_1.render)(<TimelineRail_1.TimelineRail {...defaultProps}/>);
        (0, vitest_1.expect)(react_1.screen.getByText('Timeline')).toBeInTheDocument();
    });
    (0, vitest_1.it)('has accessible navigation buttons', () => {
        (0, react_1.render)(<TimelineRail_1.TimelineRail {...defaultProps}/>);
        (0, vitest_1.expect)(react_1.screen.getByRole('button', { name: /Previous time period/i })).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByRole('button', { name: /Next time period/i })).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByRole('button', { name: /Toggle filters/i })).toBeInTheDocument();
    });
    (0, vitest_1.it)('has accessible playback controls', () => {
        (0, react_1.render)(<TimelineRail_1.TimelineRail {...defaultProps}/>);
        (0, vitest_1.expect)(react_1.screen.getByRole('button', { name: /Restart playback/i })).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByRole('button', { name: /Start playback/i })).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByRole('button', { name: /Playback speed/i })).toBeInTheDocument();
    });
    (0, vitest_1.it)('toggles play/pause label', () => {
        (0, react_1.render)(<TimelineRail_1.TimelineRail {...defaultProps}/>);
        const playButton = react_1.screen.getByRole('button', { name: /Start playback/i });
        react_1.fireEvent.click(playButton);
        (0, vitest_1.expect)(react_1.screen.getByRole('button', { name: /Pause playback/i })).toBeInTheDocument();
    });
    (0, vitest_1.it)('has accessible filter inputs when filters are shown', () => {
        (0, react_1.render)(<TimelineRail_1.TimelineRail {...defaultProps}/>);
        const filterButton = react_1.screen.getByRole('button', { name: /Toggle filters/i });
        react_1.fireEvent.click(filterButton);
        (0, vitest_1.expect)(react_1.screen.getByLabelText(/Start time/i)).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByLabelText(/End time/i)).toBeInTheDocument();
    });
});
