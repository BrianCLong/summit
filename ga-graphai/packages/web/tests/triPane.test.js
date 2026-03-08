"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
vitest_1.vi.mock('policy', () => ({
    computeWorkflowEstimates: () => ({
        criticalPath: [],
        totalLatencyMs: 0,
        totalCostUSD: 0,
    }),
    topologicalSort: (workflow) => ({
        order: workflow.nodes.map((node) => node.id),
    }),
    validateWorkflow: (workflow) => ({
        normalized: workflow,
        analysis: {
            estimated: { criticalPath: [] },
        },
        warnings: [],
    }),
}));
const evidence = [
    {
        id: 'ev-1',
        label: 'email:alice@example.com',
        confidence: 0.9,
        policies: ['policy:export'],
        time: Date.UTC(2024, 0, 1),
    },
    {
        id: 'ev-2',
        label: 'geo:berlin',
        confidence: 0.8,
        policies: ['policy:retention'],
        time: Date.UTC(2024, 0, 2),
    },
    {
        id: 'ev-3',
        label: 'case:orion-breach',
        confidence: 0.85,
        policies: ['policy:export'],
        time: Date.UTC(2024, 0, 3),
    },
];
(0, vitest_1.describe)('TriPaneController', () => {
    (0, vitest_1.it)('synchronizes selections across panels', () => {
        const controller = new index_js_1.TriPaneController();
        let mapUpdates = 0;
        controller.on('map', (state) => {
            mapUpdates += 1;
            (0, vitest_1.expect)(state.mapSelection).toBe('ev-1');
        });
        controller.selectFromGraph('person-1', evidence);
        (0, vitest_1.expect)(controller.current.timelineSelection).toBe('ev-3');
        (0, vitest_1.expect)(controller.current.policyBindings.sort()).toEqual(['policy:export', 'policy:retention'].sort());
        (0, vitest_1.expect)(controller.current.confidenceOpacity).toBeLessThanOrEqual(1);
        (0, vitest_1.expect)(controller.current.activePanel).toBe('graph');
        (0, vitest_1.expect)(mapUpdates).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('saves and restores views with explain output', () => {
        const controller = new index_js_1.TriPaneController(evidence);
        controller.selectFromGraph('person-1', evidence);
        controller.saveView('orion');
        controller.selectFromGraph('person-2', [evidence[1]]);
        const restored = controller.restoreView('orion');
        (0, vitest_1.expect)(restored?.graphSelection).toBe('person-1');
        const explain = controller.explainCurrentView();
        (0, vitest_1.expect)(explain.focus).toBe('person-1');
        (0, vitest_1.expect)(explain.evidence.length).toBe(3);
        (0, vitest_1.expect)(explain.activePanel).toBe('graph');
        (0, vitest_1.expect)(explain.policyHighlights).toContain('policy:export');
        (0, vitest_1.expect)(explain.navigationTips).toContain('Ctrl+1 Graph · Ctrl+2 Timeline · Ctrl+3 Map');
        (0, vitest_1.expect)(explain.timeWindow).toBeUndefined();
    });
    (0, vitest_1.it)('restores saved views without later mutations leaking through', () => {
        const localEvidence = evidence.map((item) => ({
            ...item,
            policies: [...item.policies],
        }));
        const controller = new index_js_1.TriPaneController(localEvidence);
        controller.selectFromGraph('person-1', localEvidence);
        controller.saveView('orion');
        localEvidence[0].label = 'mutated-label';
        controller.selectFromGraph('person-2', localEvidence);
        const restored = controller.restoreView('orion');
        (0, vitest_1.expect)(restored?.graphSelection).toBe('person-1');
        (0, vitest_1.expect)(restored?.evidence[0]?.label).toBe('email:alice@example.com');
    });
    (0, vitest_1.it)('guards state against external evidence mutation after selection', () => {
        const mutableEvidence = evidence.map((item) => ({
            ...item,
            policies: [...item.policies],
        }));
        const controller = new index_js_1.TriPaneController();
        controller.selectFromGraph('person-1', mutableEvidence);
        mutableEvidence[0].label = 'mutated';
        mutableEvidence[0].policies.push('policy:tamper');
        const current = controller.current;
        (0, vitest_1.expect)(current.evidence[0]?.label).toBe('email:alice@example.com');
        (0, vitest_1.expect)(current.evidence[0]?.policies).toEqual(['policy:export']);
    });
    (0, vitest_1.it)('returns explain view clones so consumers cannot mutate controller state', () => {
        const controller = new index_js_1.TriPaneController();
        controller.selectFromGraph('person-1', evidence);
        const explain = controller.explainCurrentView();
        explain.evidence[0].label = 'mutated';
        explain.evidence[0].policies.push('policy:tamper');
        const current = controller.current;
        (0, vitest_1.expect)(current.evidence[0]?.label).toBe('email:alice@example.com');
        (0, vitest_1.expect)(current.evidence[0]?.policies).toEqual(['policy:export']);
    });
    (0, vitest_1.it)('tracks time-to-path metric', () => {
        const controller = new index_js_1.TriPaneController();
        controller.recordPathDiscovery(1200);
        controller.recordPathDiscovery(800);
        (0, vitest_1.expect)(controller.averageTimeToPath()).toBe(1000);
    });
    (0, vitest_1.it)('builds unified layout with explain panel and command palette', () => {
        const controller = new index_js_1.TriPaneController(evidence);
        controller.selectFromGraph('person-1', evidence);
        const layout = controller.buildUnifiedLayout('graph');
        (0, vitest_1.expect)(layout.activePanel).toBe('graph');
        (0, vitest_1.expect)(layout.panes.find((pane) => pane.id === 'graph')?.linkedTo).toEqual([
            'timeline',
            'map',
        ]);
        (0, vitest_1.expect)(layout.commandPalette.commands.some((cmd) => cmd.id === 'focus.graph'))
            .toBe(true);
        (0, vitest_1.expect)(layout.explainPanel.summary).toContain('Active pane: graph');
        (0, vitest_1.expect)(layout.explainPanel.policyHighlights).toContain('policy:export');
    });
    (0, vitest_1.it)('supports command palette commands and keyboard shortcuts', () => {
        const controller = new index_js_1.TriPaneController(evidence);
        controller.registerCommand({
            id: 'save.snapshot',
            label: 'Save snapshot',
            shortcut: 'cmd+s',
            run: () => controller.saveView('snapshot'),
        });
        (0, vitest_1.expect)(controller.handleShortcut('ctrl+2')).toBe(true);
        (0, vitest_1.expect)(controller.current.activePanel).toBe('timeline');
        (0, vitest_1.expect)(controller.commandPalette('snapshot').commands.find((command) => command.id === 'save.snapshot')).toBeDefined();
        controller.selectFromMap('ev-2');
        (0, vitest_1.expect)(controller.handleShortcut('cmd+s')).toBe(true);
        (0, vitest_1.expect)(controller.restoreView('snapshot')).toBeDefined();
    });
    (0, vitest_1.it)('captures time window as SSOT and injects it into queries and keys', () => {
        const controller = new index_js_1.TriPaneController([], {
            tenantId: 'tenant-a',
            caseId: 'case-99',
        });
        controller.setTimeWindow({
            start: Date.UTC(2024, 0, 1),
            end: Date.UTC(2024, 0, 3),
            timezone: 'UTC',
        });
        controller.selectFromGraph('person-1', evidence);
        const payload = controller.buildQueryPayload({ filter: 'active' });
        (0, vitest_1.expect)(payload.timeWindow?.start).toBe(Date.UTC(2024, 0, 1));
        (0, vitest_1.expect)(payload.timeWindow?.end).toBe(Date.UTC(2024, 0, 3));
        (0, vitest_1.expect)(payload.timeWindow?.timezone).toBe('UTC');
        (0, vitest_1.expect)(payload.tenantId).toBe('tenant-a');
        (0, vitest_1.expect)(payload.caseId).toBe('case-99');
        const key = controller.buildQueryKey('graph.fetch');
        (0, vitest_1.expect)(key).toContain('tenant-a');
        (0, vitest_1.expect)(key).toContain('case-99');
        (0, vitest_1.expect)(key).toContain(`${Date.UTC(2024, 0, 1)}-${Date.UTC(2024, 0, 3)}`);
        (0, vitest_1.expect)(key).toContain('UTC');
        (0, vitest_1.expect)(controller.current.evidence.length).toBe(3);
    });
    (0, vitest_1.it)('recomputes bindings and opacity when time window filters evidence', () => {
        const controller = new index_js_1.TriPaneController(evidence);
        controller.selectFromGraph('person-1', evidence);
        controller.setTimeWindow({
            start: Date.UTC(2024, 0, 2),
            end: Date.UTC(2024, 0, 2),
        });
        (0, vitest_1.expect)(controller.current.evidence.map((item) => item.id)).toEqual(['ev-2']);
        (0, vitest_1.expect)(controller.current.policyBindings).toEqual(['policy:retention']);
        (0, vitest_1.expect)(controller.current.confidenceOpacity).toBeCloseTo(0.8);
    });
    (0, vitest_1.it)('supports undo/redo for time window and selections', () => {
        const controller = new index_js_1.TriPaneController(evidence);
        controller.selectFromGraph('person-1', evidence);
        controller.setTimeWindow({
            start: Date.UTC(2024, 0, 2),
            end: Date.UTC(2024, 0, 3),
        });
        controller.selectFromTimeline('ev-3');
        (0, vitest_1.expect)(controller.current.timelineSelection).toBe('ev-3');
        (0, vitest_1.expect)(controller.current.timeWindow?.start).toBe(Date.UTC(2024, 0, 2));
        controller.undo();
        (0, vitest_1.expect)(controller.current.timelineSelection).toBe('ev-3');
        (0, vitest_1.expect)(controller.current.timeWindow?.start).toBe(Date.UTC(2024, 0, 2));
        controller.undo();
        (0, vitest_1.expect)(controller.current.timeWindow).toBeUndefined();
        controller.redo();
        (0, vitest_1.expect)(controller.current.timeWindow?.start).toBe(Date.UTC(2024, 0, 2));
    });
    (0, vitest_1.it)('exposes keyboard-friendly time brush handles that adjust the window', () => {
        const controller = new index_js_1.TriPaneController();
        controller.setTimeWindow({
            start: Date.UTC(2024, 0, 1),
            end: Date.UTC(2024, 0, 2),
        });
        const handles = controller.getTimeBrushHandles(24 * 60 * 60 * 1000);
        const startKeyDown = handles.startHandle.onKeyDown;
        startKeyDown({ key: 'ArrowLeft' });
        (0, vitest_1.expect)(controller.current.timeWindow?.start).toBe(Date.UTC(2023, 11, 31));
        const endKeyDown = handles.endHandle.onKeyDown;
        endKeyDown({ key: 'ArrowRight', shiftKey: true });
        (0, vitest_1.expect)(controller.current.timeWindow?.end).toBe(Date.UTC(2024, 0, 4));
        (0, vitest_1.expect)(handles.startHandle.role).toBe('slider');
        (0, vitest_1.expect)(handles.endHandle['aria-label']).toBe('Time brush end');
        (0, vitest_1.expect)(typeof handles.liveRegion()).toBe('string');
    });
});
