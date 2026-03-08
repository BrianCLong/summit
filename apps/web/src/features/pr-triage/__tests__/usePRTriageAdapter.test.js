"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const react_1 = require("@testing-library/react");
const usePRTriageAdapter_1 = require("../usePRTriageAdapter");
const types_1 = require("../types");
(0, vitest_1.describe)('usePRTriageAdapter', () => {
    (0, vitest_1.beforeEach)(() => {
        window.localStorage.clear();
    });
    (0, vitest_1.it)('returns all mock PRs with default filters', async () => {
        const { result } = (0, react_1.renderHook)(() => (0, usePRTriageAdapter_1.usePRTriageAdapter)());
        let prs = [];
        await (0, react_1.act)(async () => {
            prs = await result.current.list(types_1.defaultPRTriageFilters);
        });
        (0, vitest_1.expect)(prs.length).toBe(usePRTriageAdapter_1.baseMockPRs.length);
    });
    (0, vitest_1.it)('filters by status', async () => {
        const { result } = (0, react_1.renderHook)(() => (0, usePRTriageAdapter_1.usePRTriageAdapter)());
        let prs = [];
        await (0, react_1.act)(async () => {
            prs = await result.current.list({ ...types_1.defaultPRTriageFilters, status: 'merge-ready' });
        });
        (0, vitest_1.expect)(prs.every(p => p.status === 'merge-ready')).toBe(true);
        (0, vitest_1.expect)(prs.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('filters by priority', async () => {
        const { result } = (0, react_1.renderHook)(() => (0, usePRTriageAdapter_1.usePRTriageAdapter)());
        let prs = [];
        await (0, react_1.act)(async () => {
            prs = await result.current.list({ ...types_1.defaultPRTriageFilters, priority: 'critical' });
        });
        (0, vitest_1.expect)(prs.every(p => p.priority === 'critical')).toBe(true);
    });
    (0, vitest_1.it)('filters by partial assignee name', async () => {
        const { result } = (0, react_1.renderHook)(() => (0, usePRTriageAdapter_1.usePRTriageAdapter)());
        let prs = [];
        await (0, react_1.act)(async () => {
            prs = await result.current.list({ ...types_1.defaultPRTriageFilters, assignee: 'alex' });
        });
        (0, vitest_1.expect)(prs.every(p => p.assignee?.toLowerCase().includes('alex'))).toBe(true);
        (0, vitest_1.expect)(prs.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('get returns the correct PR by id', async () => {
        const { result } = (0, react_1.renderHook)(() => (0, usePRTriageAdapter_1.usePRTriageAdapter)());
        let pr;
        await (0, react_1.act)(async () => {
            pr = await result.current.get('pr-101');
        });
        (0, vitest_1.expect)(pr?.number).toBe(101);
    });
    (0, vitest_1.it)('get returns undefined for unknown id', async () => {
        const { result } = (0, react_1.renderHook)(() => (0, usePRTriageAdapter_1.usePRTriageAdapter)());
        let pr;
        await (0, react_1.act)(async () => {
            pr = await result.current.get('pr-unknown');
        });
        (0, vitest_1.expect)(pr).toBeUndefined();
    });
    (0, vitest_1.it)('act records a decision in decisions list', async () => {
        const { result } = (0, react_1.renderHook)(() => (0, usePRTriageAdapter_1.usePRTriageAdapter)());
        await (0, react_1.act)(async () => {
            await result.current.act('pr-101', 'approve', { comment: 'LGTM' });
        });
        (0, vitest_1.expect)(result.current.decisions.length).toBe(1);
        (0, vitest_1.expect)(result.current.decisions[0].action).toBe('approve');
        (0, vitest_1.expect)(result.current.decisions[0].comment).toBe('LGTM');
        (0, vitest_1.expect)(result.current.decisions[0].prId).toBe('pr-101');
    });
    (0, vitest_1.it)('act with assign updates the PR assignee', async () => {
        const { result } = (0, react_1.renderHook)(() => (0, usePRTriageAdapter_1.usePRTriageAdapter)());
        await (0, react_1.act)(async () => {
            await result.current.act('pr-102', 'assign', { assignedTo: 'new.owner' });
        });
        let prs = [];
        await (0, react_1.act)(async () => {
            prs = await result.current.list(types_1.defaultPRTriageFilters);
        });
        const pr102 = prs.find(p => p.id === 'pr-102');
        (0, vitest_1.expect)(pr102?.assignee).toBe('new.owner');
    });
    (0, vitest_1.it)('reset restores original mock data and clears decisions', async () => {
        const { result } = (0, react_1.renderHook)(() => (0, usePRTriageAdapter_1.usePRTriageAdapter)());
        await (0, react_1.act)(async () => {
            await result.current.act('pr-101', 'defer');
        });
        (0, vitest_1.expect)(result.current.decisions.length).toBe(1);
        (0, react_1.act)(() => {
            result.current.reset();
        });
        (0, vitest_1.expect)(result.current.decisions.length).toBe(0);
        let prs = [];
        await (0, react_1.act)(async () => {
            prs = await result.current.list(types_1.defaultPRTriageFilters);
        });
        (0, vitest_1.expect)(prs.length).toBe(usePRTriageAdapter_1.baseMockPRs.length);
    });
    (0, vitest_1.it)('each mock PR has riskChecks with valid riskLevel values', () => {
        const validLevels = new Set(['none', 'low', 'medium', 'high', 'critical']);
        usePRTriageAdapter_1.baseMockPRs.forEach(pr => {
            pr.riskChecks.forEach(check => {
                (0, vitest_1.expect)(validLevels.has(check.riskLevel)).toBe(true);
            });
        });
    });
    (0, vitest_1.it)('each mock PR has at least one diffFile', () => {
        usePRTriageAdapter_1.baseMockPRs.forEach(pr => {
            (0, vitest_1.expect)(pr.diffFiles.length).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.it)('each mock PR has convergence info', () => {
        usePRTriageAdapter_1.baseMockPRs.forEach(pr => {
            (0, vitest_1.expect)(typeof pr.convergence.mergesCleanly).toBe('boolean');
            (0, vitest_1.expect)(typeof pr.convergence.behindByCommits).toBe('number');
            (0, vitest_1.expect)(Array.isArray(pr.convergence.deprecatedBranches)).toBe(true);
        });
    });
});
