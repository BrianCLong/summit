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
exports.TriPaneProvider = TriPaneProvider;
exports.useTriPane = useTriPane;
const react_1 = __importStar(require("react"));
const config_1 = require("../config");
const data_1 = require("../data");
const STORAGE_KEY = 'tri-pane:saved-views';
const STORAGE_VERSION = config_1.SAVED_VIEWS_VERSION;
const initialRange = { start: 1, end: 17 };
const MIN_TIME = 0;
const MAX_TIME = 24;
const defaultSnapshot = {
    name: 'Active ops',
    timeRange: initialRange,
    pinnedNodes: [],
    activeLayers: ['signals', 'comms', 'logistics'],
    geofence: data_1.geofences[0]?.id ?? null,
    filterText: '',
    layoutMode: 'grid',
    focusNodeId: undefined
};
const defaultRecord = {
    id: 'default-active',
    version: STORAGE_VERSION,
    createdAt: new Date().toISOString(),
    snapshot: defaultSnapshot
};
const initialState = {
    ...defaultSnapshot,
    savedViews: [defaultRecord],
    toast: null
};
function normalizeSnapshot(snapshot) {
    const start = Math.max(MIN_TIME, Math.min(snapshot.timeRange.start, MAX_TIME));
    const end = Math.min(MAX_TIME, Math.max(start + 0.5, snapshot.timeRange.end));
    return {
        ...snapshot,
        layoutMode: snapshot.layoutMode ?? 'grid',
        activeLayers: snapshot.activeLayers ?? [],
        pinnedNodes: snapshot.pinnedNodes ?? [],
        filterText: snapshot.filterText ?? '',
        timeRange: { start, end }
    };
}
const TriPaneContext = (0, react_1.createContext)({ state: initialState, dispatch: () => undefined });
function reducer(state, action) {
    switch (action.type) {
        case 'setTimeRange':
            return { ...state, timeRange: action.payload };
        case 'toggleLayer': {
            const exists = state.activeLayers.includes(action.payload);
            const nextLayers = exists
                ? state.activeLayers.filter((layer) => layer !== action.payload)
                : [...state.activeLayers, action.payload];
            return { ...state, activeLayers: nextLayers };
        }
        case 'setGeofence':
            return { ...state, geofence: action.payload };
        case 'togglePin': {
            const pinned = state.pinnedNodes.includes(action.payload);
            const nextPins = pinned
                ? state.pinnedNodes.filter((id) => id !== action.payload)
                : [...state.pinnedNodes, action.payload];
            return { ...state, pinnedNodes: nextPins };
        }
        case 'setFilterText':
            return { ...state, filterText: action.payload };
        case 'setFocusNode':
            return { ...state, focusNodeId: action.payload };
        case 'setLayoutMode':
            return { ...state, layoutMode: action.payload };
        case 'saveView': {
            const snapshot = normalizeSnapshot({
                name: action.payload.trim() || 'Untitled view',
                timeRange: state.timeRange,
                pinnedNodes: state.pinnedNodes,
                activeLayers: state.activeLayers,
                geofence: state.geofence,
                filterText: state.filterText,
                layoutMode: state.layoutMode,
                focusNodeId: state.focusNodeId
            });
            const existing = state.savedViews.find((record) => record.snapshot.name === snapshot.name);
            const recordId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : `view-${Date.now()}`;
            const record = existing
                ? { ...existing, snapshot }
                : {
                    id: recordId,
                    version: STORAGE_VERSION,
                    createdAt: new Date().toISOString(),
                    snapshot
                };
            const withoutExisting = state.savedViews.filter((entry) => entry.id !== record.id);
            return { ...state, savedViews: [...withoutExisting, record] };
        }
        case 'loadView': {
            const record = state.savedViews.find((v) => v.id === action.payload);
            if (!record)
                return state;
            const invalidGeofence = record.snapshot.geofence && !data_1.geofences.find((g) => g.id === record.snapshot.geofence);
            const validLayers = record.snapshot.activeLayers.filter((layer) => data_1.layers.some((l) => l.id === layer));
            const missingLayers = record.snapshot.activeLayers.length !== validLayers.length;
            const validPins = record.snapshot.pinnedNodes.filter((pin) => data_1.nodes.some((node) => node.id === pin));
            const missingPins = record.snapshot.pinnedNodes.length !== validPins.length;
            const nextSnapshot = normalizeSnapshot({
                ...record.snapshot,
                geofence: invalidGeofence ? null : record.snapshot.geofence,
                activeLayers: validLayers,
                pinnedNodes: validPins
            });
            let toast = null;
            if (invalidGeofence || missingLayers || missingPins) {
                toast = {
                    id: `toast-${Date.now()}`,
                    tone: 'warning',
                    message: 'Restored with omissions: missing geofence or filtered entities were removed.'
                };
            }
            return { ...state, ...nextSnapshot, toast };
        }
        case 'replaceViews':
            return { ...state, savedViews: action.payload };
        case 'showToast':
            return { ...state, toast: action.payload };
        case 'dismissToast':
            return { ...state, toast: null };
        default:
            return state;
    }
}
function TriPaneProvider({ children }) {
    const [state, dispatch] = (0, react_1.useReducer)(reducer, initialState, (base) => {
        if (typeof window === 'undefined')
            return base;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw)
                return base;
            const parsed = JSON.parse(raw);
            if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.views)) {
                return base;
            }
            const views = parsed.views
                .filter((view) => view.version === STORAGE_VERSION)
                .map((view) => ({
                ...view,
                snapshot: normalizeSnapshot(view.snapshot)
            }));
            const hydratedViews = views.length > 0 ? views : [defaultRecord];
            const latest = hydratedViews[hydratedViews.length - 1]?.snapshot ?? base;
            return { ...base, ...latest, savedViews: hydratedViews };
        }
        catch (error) {
            console.warn('Failed to read saved views; falling back to defaults', error);
            return base;
        }
    });
    (0, react_1.useEffect)(() => {
        if (typeof window === 'undefined')
            return;
        const payload = { version: STORAGE_VERSION, views: state.savedViews };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }, [state.savedViews]);
    (0, react_1.useEffect)(() => {
        if (!state.toast)
            return;
        const timer = setTimeout(() => dispatch({ type: 'dismissToast' }), 4000);
        return () => clearTimeout(timer);
    }, [state.toast]);
    const value = (0, react_1.useMemo)(() => ({ state, dispatch }), [state, dispatch]);
    return <TriPaneContext.Provider value={value}>{children}</TriPaneContext.Provider>;
}
function useTriPane() {
    const ctx = (0, react_1.useContext)(TriPaneContext);
    if (!ctx)
        throw new Error('TriPaneContext missing');
    return ctx;
}
