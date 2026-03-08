"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultPresetFor = exports.persistWorkspaceState = exports.loadWorkspaceState = exports.migrateWorkspaceState = void 0;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const presets_1 = require("./presets");
const STORAGE_PREFIX = 'intelgraph.workspaces';
const getDefaultWorkspaceState = (currentPath) => {
    const presets = {
        investigate: {
            ...presets_1.defaultWorkspacePresets.investigate,
            lastRoute: currentPath || presets_1.defaultWorkspacePresets.investigate.defaultRoute,
            lastUpdated: Date.now(),
        },
        review: { ...presets_1.defaultWorkspacePresets.review },
        briefing: { ...presets_1.defaultWorkspacePresets.briefing },
    };
    return {
        version: presets_1.WORKSPACE_STORAGE_VERSION,
        activeWorkspaceId: 'investigate',
        workspaces: presets,
    };
};
const ensurePanelCoverage = (panels, presetId = 'investigate') => {
    const defaultPanels = presets_1.defaultWorkspacePresets[presetId].panels;
    const merged = { ...panels };
    Object.keys(defaultPanels).forEach(panelKey => {
        merged[panelKey] = {
            ...defaultPanels[panelKey],
            ...(panels[panelKey] || {}),
        };
    });
    return merged;
};
const migrateFromV1 = (raw, currentPath) => {
    const base = getDefaultWorkspaceState(currentPath);
    const activeWorkspaceId = raw.activeWorkspaceId && base.workspaces[raw.activeWorkspaceId]
        ? raw.activeWorkspaceId
        : base.activeWorkspaceId;
    const workspaces = { ...base.workspaces };
    Object.entries(raw.layouts || {}).forEach(([id, layout]) => {
        if (!workspaces[id]) {
            return;
        }
        workspaces[id] = {
            ...workspaces[id],
            panels: layout?.panels
                ? ensurePanelCoverage(layout.panels, id)
                : workspaces[id].panels,
            defaultRoute: layout?.defaultRoute ||
                workspaces[id].defaultRoute,
            lastUpdated: Date.now(),
        };
    });
    return {
        version: presets_1.WORKSPACE_STORAGE_VERSION,
        activeWorkspaceId,
        workspaces,
    };
};
const migrateWorkspaceState = (raw, currentPath) => {
    if (!raw || typeof raw !== 'object') {
        return getDefaultWorkspaceState(currentPath);
    }
    const parsed = raw;
    if (parsed.version === presets_1.WORKSPACE_STORAGE_VERSION && parsed.workspaces) {
        const workspaces = Object.entries(parsed.workspaces).reduce((acc, [id, workspace]) => {
            const presetId = id;
            const preset = workspace || presets_1.defaultWorkspacePresets[presetId];
            if (!preset)
                return acc;
            acc[presetId] = {
                ...presets_1.defaultWorkspacePresets[presetId],
                ...preset,
                panels: ensurePanelCoverage(preset.panels, presetId),
                lastUpdated: preset.lastUpdated || Date.now(),
                lastRoute: preset.lastRoute ||
                    preset.defaultRoute ||
                    presets_1.defaultWorkspacePresets[presetId].defaultRoute,
            };
            return acc;
        }, {});
        const activeWorkspaceId = parsed.activeWorkspaceId && workspaces[parsed.activeWorkspaceId]
            ? parsed.activeWorkspaceId
            : 'investigate';
        return {
            version: presets_1.WORKSPACE_STORAGE_VERSION,
            activeWorkspaceId,
            workspaces,
        };
    }
    if (!parsed.version) {
        return migrateFromV1(raw, currentPath);
    }
    if ((parsed.version || 0) < presets_1.WORKSPACE_STORAGE_VERSION) {
        const downgraded = {
            activeWorkspaceId: parsed.activeWorkspaceId || 'investigate',
            layouts: parsed.layouts || {},
        };
        return migrateFromV1(downgraded, currentPath);
    }
    return getDefaultWorkspaceState(currentPath);
};
exports.migrateWorkspaceState = migrateWorkspaceState;
const loadWorkspaceState = (userKey, currentPath) => {
    if (typeof localStorage === 'undefined') {
        return getDefaultWorkspaceState(currentPath);
    }
    const storageKey = `${STORAGE_PREFIX}.${userKey}`;
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
        return getDefaultWorkspaceState(currentPath);
    }
    try {
        const parsed = JSON.parse(raw);
        return (0, exports.migrateWorkspaceState)(parsed, currentPath);
    }
    catch (error) {
        console.warn('Failed to parse workspace layout state, resetting.', error);
        return getDefaultWorkspaceState(currentPath);
    }
};
exports.loadWorkspaceState = loadWorkspaceState;
const persistWorkspaceState = (userKey, state) => {
    if (typeof localStorage === 'undefined') {
        return;
    }
    const storageKey = `${STORAGE_PREFIX}.${userKey}`;
    localStorage.setItem(storageKey, JSON.stringify({
        ...state,
        version: presets_1.WORKSPACE_STORAGE_VERSION,
    }));
};
exports.persistWorkspaceState = persistWorkspaceState;
const getDefaultPresetFor = (workspaceId, currentPath) => {
    const base = getDefaultWorkspaceState(currentPath);
    return base.workspaces[workspaceId];
};
exports.getDefaultPresetFor = getDefaultPresetFor;
