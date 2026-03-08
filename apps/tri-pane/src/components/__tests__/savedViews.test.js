"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const user_event_1 = __importDefault(require("@testing-library/user-event"));
const vitest_1 = require("vitest");
const EventBus_1 = require("../EventBus");
const SavedViewsPanel_1 = require("../SavedViewsPanel");
const TimelinePane_1 = require("../TimelinePane");
const Toast_1 = require("../Toast");
const config_1 = require("../../config");
function Wrapper({ children }) {
    return <EventBus_1.TriPaneProvider>{children}</EventBus_1.TriPaneProvider>;
}
(0, vitest_1.describe)('Saved views', () => {
    (0, vitest_1.beforeEach)(() => {
        localStorage.clear();
        vitest_1.vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.useRealTimers();
    });
    (0, vitest_1.it)('saves, persists, reloads, and restores a time window', async () => {
        const user = user_event_1.default.setup({ advanceTimers: vitest_1.vi.advanceTimersByTime });
        const { unmount } = (0, react_2.render)(<Wrapper>
        <SavedViewsPanel_1.SavedViewsPanel />
        <TimelinePane_1.TimelinePane />
      </Wrapper>);
        const nameInput = react_2.screen.getByLabelText(/Name/i);
        await user.clear(nameInput);
        await user.type(nameInput, 'Morning brush');
        const startSlider = react_2.screen.getByLabelText('Start');
        const endSlider = react_2.screen.getByLabelText('End');
        // Change sliders and flush rAF callbacks
        (0, react_2.act)(() => {
            react_2.fireEvent.change(startSlider, { target: { value: '6' } });
        });
        await (0, react_2.act)(async () => {
            vitest_1.vi.runAllTimers();
        });
        (0, react_2.act)(() => {
            react_2.fireEvent.change(endSlider, { target: { value: '12' } });
        });
        await (0, react_2.act)(async () => {
            vitest_1.vi.runAllTimers();
        });
        await user.click(react_2.screen.getByRole('button', { name: /Save view/i }));
        const stored = localStorage.getItem('tri-pane:saved-views');
        (0, vitest_1.expect)(stored).toBeTruthy();
        const parsed = JSON.parse(stored ?? '{}');
        (0, vitest_1.expect)(parsed.version).toBe(config_1.SAVED_VIEWS_VERSION);
        (0, vitest_1.expect)(parsed.views[parsed.views.length - 1].snapshot.timeRange).toEqual({ start: 6, end: 12 });
        // Move sliders away to prove restoration changes state
        react_2.fireEvent.change(startSlider, { target: { value: '1' } });
        react_2.fireEvent.change(endSlider, { target: { value: '17' } });
        unmount();
        (0, react_2.render)(<Wrapper>
        <SavedViewsPanel_1.SavedViewsPanel />
        <TimelinePane_1.TimelinePane />
      </Wrapper>);
        await user.click(react_2.screen.getByRole('button', { name: /Morning brush/i }));
        (0, vitest_1.expect)(react_2.screen.getByText(/Start 6/)).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText(/End 12/)).toBeInTheDocument();
    });
    (0, vitest_1.it)('shows a toast when restored view references missing data', async () => {
        const user = user_event_1.default.setup({ advanceTimers: vitest_1.vi.advanceTimersByTime });
        const snapshot = {
            name: 'Missing data',
            timeRange: { start: 2, end: 5 },
            pinnedNodes: ['ghost'],
            activeLayers: ['comms', 'logistics'],
            geofence: 'missing',
            filterText: '',
            layoutMode: 'grid'
        };
        const record = {
            id: 'missing',
            version: config_1.SAVED_VIEWS_VERSION,
            createdAt: new Date().toISOString(),
            snapshot
        };
        localStorage.setItem('tri-pane:saved-views', JSON.stringify({ version: config_1.SAVED_VIEWS_VERSION, views: [record] }));
        (0, react_2.render)(<Wrapper>
        <SavedViewsPanel_1.SavedViewsPanel />
        <Toast_1.Toast />
      </Wrapper>);
        await user.click(react_2.screen.getByRole('button', { name: /Missing data/i }));
        (0, vitest_1.expect)(react_2.screen.getByText(/Restored with omissions/i)).toBeInTheDocument();
    });
});
