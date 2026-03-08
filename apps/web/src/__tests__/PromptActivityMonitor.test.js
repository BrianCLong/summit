"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const vitest_1 = require("vitest");
const SymphonyOperatorConsole_1 = require("../SymphonyOperatorConsole");
const createMockFetch = () => vitest_1.vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ history: [] }),
});
(0, vitest_1.describe)('PromptActivityMonitor', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.useFakeTimers();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.useRealTimers();
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.test)('pauses polling when the Prompts tab is inactive', async () => {
        const mockFetch = createMockFetch();
        global.fetch = mockFetch;
        (0, react_1.render)(<SymphonyOperatorConsole_1.PromptActivityMonitor active={false}/>);
        vitest_1.vi.advanceTimersByTime(6000);
        (0, vitest_1.expect)(mockFetch).not.toHaveBeenCalled();
    });
    // TODO: Test has async timing issues causing "window is not defined" error
    vitest_1.test.skip('starts polling when the Prompts tab becomes active', async () => {
        const mockFetch = createMockFetch();
        global.fetch = mockFetch;
        const { rerender } = (0, react_1.render)(<SymphonyOperatorConsole_1.PromptActivityMonitor active={false}/>);
        rerender(<SymphonyOperatorConsole_1.PromptActivityMonitor active={true}/>);
        await vitest_1.vi.runAllTimersAsync();
        (0, vitest_1.expect)(mockFetch).toHaveBeenCalled();
        vitest_1.vi.advanceTimersByTime(5000);
        await vitest_1.vi.runAllTimersAsync();
        (0, vitest_1.expect)(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
});
