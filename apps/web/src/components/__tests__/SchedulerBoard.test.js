"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const vitest_1 = require("vitest");
const react_2 = __importDefault(require("react"));
const SchedulerBoard_1 = __importDefault(require("../SchedulerBoard"));
// Global EventSource mock setup
let eventSourceInstance;
global.EventSource = class EventSource {
    onmessage = null;
    close = vitest_1.vi.fn();
    addEventListener = vitest_1.vi.fn();
    removeEventListener = vitest_1.vi.fn();
    constructor(url) {
        eventSourceInstance = this;
    }
};
// Mock fetch
global.fetch = vitest_1.vi.fn(() => Promise.resolve({
    json: () => Promise.resolve({ minuteAhead: 5 }),
}));
(0, vitest_1.describe)('SchedulerBoard', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        eventSourceInstance = null;
    });
    (0, vitest_1.it)('renders queue items and filters them', async () => {
        (0, react_1.render)(<SchedulerBoard_1.default />);
        // Wait for the component to mount and set up the EventSource listener
        await (0, react_1.waitFor)(() => (0, vitest_1.expect)(eventSourceInstance).toBeTruthy());
        // Simulate incoming data
        const queueData = [
            { id: '1', tenant: 'TenantA', eta: '10:00', pool: 'pool-1', cost: 10, preemptSuggestion: false },
            { id: '2', tenant: 'TenantB', eta: '10:05', pool: 'pool-2', cost: 20, preemptSuggestion: true },
        ];
        // Simulate receiving data via onmessage
        if (eventSourceInstance) {
            const event = { data: JSON.stringify(queueData) };
            if (eventSourceInstance.onmessage) {
                // Need to wrap in act? render and fireEvent handle it usually.
                // Since this is outside react lifecycle event, strictly speaking yes,
                // but for now let's try direct call.
                eventSourceInstance.onmessage(event);
            }
        }
        // Verify items are rendered
        await (0, react_1.waitFor)(() => {
            (0, vitest_1.expect)(react_1.screen.getByText('TenantA')).toBeInTheDocument();
            (0, vitest_1.expect)(react_1.screen.getByText('TenantB')).toBeInTheDocument();
        });
        // Test filtering
        const filterInput = react_1.screen.getByPlaceholderText('filter tenant…');
        react_1.fireEvent.input(filterInput, { target: { value: 'TenantA' } });
        // Verify filtering behavior
        // TenantA should be visible
        const rowA = react_1.screen.getByText('TenantA').closest('tr');
        (0, vitest_1.expect)(rowA).toBeVisible();
        // TenantB should be hidden (current impl) or removed (future impl)
        const rowBText = react_1.screen.queryByText('TenantB');
        if (rowBText) {
            const rowB = rowBText.closest('tr');
            // If it exists, it must be hidden.
            // Note: expect(element).not.toBeVisible() passes if display: none.
            (0, vitest_1.expect)(rowB).not.toBeVisible();
        }
        else {
            // If it doesn't exist (future implementation), that's also correct filtering.
            (0, vitest_1.expect)(rowBText).not.toBeInTheDocument();
        }
    });
});
