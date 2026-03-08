"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const vitest_1 = require("vitest");
const useSearchSessions_1 = require("./useSearchSessions");
const createFilters = () => ({
    entityTypes: [],
    relationshipTypes: [],
    dateRange: { start: '', end: '' },
    confidenceRange: { min: 0, max: 1 },
    tags: [],
    sources: [],
});
(0, vitest_1.describe)('useSearchSessions', () => {
    (0, vitest_1.beforeEach)(() => {
        localStorage.clear();
    });
    (0, vitest_1.it)('adds and activates a new session tab', () => {
        const { result } = (0, react_1.renderHook)(() => (0, useSearchSessions_1.useSearchSessions)(true, createFilters));
        (0, react_1.act)(() => {
            result.current.addSession();
        });
        (0, vitest_1.expect)(result.current.sessions).toHaveLength(2);
        (0, vitest_1.expect)(result.current.activeSessionId).toBe(result.current.sessions[1].id);
    });
    (0, vitest_1.it)('closes the active session and falls back to another tab', async () => {
        const { result } = (0, react_1.renderHook)(() => (0, useSearchSessions_1.useSearchSessions)(true, createFilters));
        (0, react_1.act)(() => {
            result.current.addSession();
        });
        await (0, react_1.waitFor)(() => {
            (0, vitest_1.expect)(result.current.sessions).toHaveLength(2);
        });
        (0, react_1.act)(() => {
            result.current.selectSession(result.current.sessions[1].id);
        });
        const closingId = result.current.activeSessionId;
        (0, react_1.act)(() => {
            result.current.closeSession(closingId);
        });
        (0, vitest_1.expect)(result.current.sessions).toHaveLength(1);
        (0, vitest_1.expect)(result.current.activeSessionId).not.toBe(closingId);
    });
    (0, vitest_1.it)('restores sessions from local storage', async () => {
        const firstRender = (0, react_1.renderHook)(() => (0, useSearchSessions_1.useSearchSessions)(true, createFilters));
        (0, react_1.act)(() => {
            firstRender.result.current.updateActiveSession({ query: 'malware' });
        });
        await (0, react_1.waitFor)(() => (0, vitest_1.expect)(localStorage.getItem(useSearchSessions_1.SEARCH_SESSION_STORAGE_KEY)).not.toBeNull());
        const savedActiveId = firstRender.result.current.activeSessionId;
        firstRender.unmount();
        const secondRender = (0, react_1.renderHook)(() => (0, useSearchSessions_1.useSearchSessions)(true, createFilters));
        (0, vitest_1.expect)(secondRender.result.current.restoredFromStorage).toBe(true);
        (0, vitest_1.expect)(secondRender.result.current.activeSessionId).toBe(savedActiveId);
        (0, vitest_1.expect)(secondRender.result.current.activeSession?.query).toBe('malware');
    });
});
