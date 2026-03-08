"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspacePanelOrder = exports.defaultWorkspacePresets = exports.WORKSPACE_STORAGE_VERSION = void 0;
exports.WORKSPACE_STORAGE_VERSION = 2;
const basePanels = {
    graph: { visible: true, size: 6 },
    timeline: { visible: true, size: 3 },
    map: { visible: true, size: 3 },
    queue: { visible: false, size: 3 },
    notes: { visible: false, size: 4 },
};
const clonePanels = () => ({
    graph: { ...basePanels.graph },
    timeline: { ...basePanels.timeline },
    map: { ...basePanels.map },
    queue: { ...basePanels.queue },
    notes: { ...basePanels.notes },
});
const createPreset = (id, label, description, defaultRoute, overrides) => {
    const panels = clonePanels();
    Object.entries(overrides).forEach(([panel, value]) => {
        if (!value)
            return;
        panels[panel] = { ...panels[panel], ...value };
    });
    return {
        id,
        label,
        description,
        defaultRoute,
        panels,
        lastRoute: defaultRoute,
        lastUpdated: Date.now(),
    };
};
exports.defaultWorkspacePresets = {
    investigate: createPreset('investigate', 'Investigate', 'Graph-forward workspace tuned for discovery.', '/analysis/tri-pane', {
        graph: { size: 7 },
        timeline: { size: 3, visible: true },
        map: { size: 2 },
    }),
    review: createPreset('review', 'Review', 'Queue-heavy workspace for triage and follow-up.', '/cases', {
        graph: { size: 4 },
        timeline: { size: 4 },
        map: { size: 2 },
        queue: { visible: true, size: 4 },
    }),
    briefing: createPreset('briefing', 'Briefing', 'Notes-forward view for exports and briefings.', '/reports', {
        graph: { size: 4 },
        timeline: { size: 3 },
        map: { visible: false, size: 2 },
        notes: { visible: true, size: 5 },
    }),
};
exports.workspacePanelOrder = [
    'timeline',
    'graph',
    'map',
    'queue',
    'notes',
];
