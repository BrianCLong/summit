"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const state_1 = require("../state");
(0, vitest_1.describe)('deriveChecklistStatus', () => {
    (0, vitest_1.it)('returns red when checklist missing', () => {
        (0, vitest_1.expect)((0, state_1.deriveChecklistStatus)(undefined)).toBe('red');
        (0, vitest_1.expect)((0, state_1.deriveChecklistStatus)([])).toBe('red');
    });
    (0, vitest_1.it)('returns red when any item is red', () => {
        (0, vitest_1.expect)((0, state_1.deriveChecklistStatus)([
            { id: '1', name: 'test', status: 'green', evidence: { label: 'a', url: '#' } },
            { id: '2', name: 'bad', status: 'red', evidence: { label: 'b', url: '#' } },
        ])).toBe('red');
    });
    (0, vitest_1.it)('returns yellow when no red but at least one yellow', () => {
        (0, vitest_1.expect)((0, state_1.deriveChecklistStatus)([
            { id: '1', name: 'test', status: 'green', evidence: { label: 'a', url: '#' } },
            { id: '2', name: 'warn', status: 'yellow', evidence: { label: 'b', url: '#' } },
        ])).toBe('yellow');
    });
    (0, vitest_1.it)('returns green when all pass', () => {
        (0, vitest_1.expect)((0, state_1.deriveChecklistStatus)([
            { id: '1', name: 'ok', status: 'green', evidence: { label: 'a', url: '#' } },
        ])).toBe('green');
    });
});
(0, vitest_1.describe)('statusReducer', () => {
    (0, vitest_1.it)('fails closed on fetch failure and escalates banner', () => {
        const action = { type: 'FETCH_FAILURE', key: 'ci', error: 'network error' };
        const state = (0, state_1.statusReducer)(state_1.initialState, action);
        (0, vitest_1.expect)(state.statuses.ci?.status).toBe('red');
        (0, vitest_1.expect)(state.banner.level).toBe('red');
    });
    (0, vitest_1.it)('derives GA status from checklist payloads', () => {
        const action = {
            type: 'FETCH_SUCCESS',
            key: 'ga',
            payload: {
                system: 'GA',
                status: 'green',
                summary: 'ignore status field',
                updatedAt: new Date().toISOString(),
                evidence: [],
                checklist: [
                    { id: '1', name: 'ok', status: 'green', evidence: { label: 'a', url: '#' } },
                    { id: '2', name: 'warning', status: 'yellow', evidence: { label: 'b', url: '#' } },
                ],
            },
        };
        const state = (0, state_1.statusReducer)(state_1.initialState, action);
        (0, vitest_1.expect)(state.statuses.ga?.status).toBe('yellow');
    });
});
