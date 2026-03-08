"use strict";
/**
 * Analyst View Context & Hooks
 *
 * Provides shared global view state across all panes (Graph, Timeline, Map)
 * in the analyst console. All panes react to the same state for synchronized
 * cross-highlighting, filtering, and selection.
 */
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
exports.AnalystViewProvider = AnalystViewProvider;
exports.useAnalystView = useAnalystView;
exports.useGlobalTimeBrush = useGlobalTimeBrush;
exports.useSelection = useSelection;
exports.useViewFilters = useViewFilters;
exports.useViewState = useViewState;
exports.createDefaultViewState = createDefaultViewState;
const react_1 = __importStar(require("react"));
const timeWindow_1 = require("@/domain/timeWindow");
// =============================================================================
// Context Creation
// =============================================================================
const AnalystViewContext = (0, react_1.createContext)(undefined);
/**
 * Provider component that wraps the analyst console and provides
 * shared view state to all child panes.
 */
function AnalystViewProvider({ initialState, children, }) {
    // Ensure initial state has timeWindowSeq
    const [state, setState] = (0, react_1.useState)(() => ({
        ...initialState,
        timeWindowSeq: initialState.timeWindowSeq ?? 0,
        timeWindow: (0, timeWindow_1.normalizeWindow)(initialState.timeWindow)
    }));
    // Store initial state for reset functionality
    const initialStateRef = react_1.default.useRef(initialState);
    /**
     * Update the global time window - affects filtering in all panes
     */
    const setTimeWindow = (0, react_1.useCallback)((timeWindow, meta) => {
        // 1. Normalize
        const normalized = (0, timeWindow_1.normalizeWindow)(timeWindow);
        // 2. Assert Valid (Dev only check ideally, but safe to keep cheap checks)
        if (process.env.NODE_ENV !== 'production') {
            (0, timeWindow_1.assertValidWindow)(normalized);
        }
        setState(prev => {
            // Avoid update if identical (optional optimization, but strict equality of objects usually fails)
            if (prev.timeWindow.startMs === normalized.startMs &&
                prev.timeWindow.endMs === normalized.endMs &&
                prev.timeWindow.granularity === normalized.granularity &&
                prev.timeWindow.tzMode === normalized.tzMode) {
                return prev;
            }
            // 3. Emit Telemetry (console for now)
            console.log('triPane.timeWindow.change', {
                window: normalized,
                source: meta?.source,
                prevSeq: prev.timeWindowSeq
            });
            // 4. Update State & Bump Sequence
            return {
                ...prev,
                timeWindow: normalized,
                timeWindowSeq: prev.timeWindowSeq + 1
            };
        });
    }, []);
    /**
     * Update filters - merges with existing filters
     */
    const setFilters = (0, react_1.useCallback)((filters) => {
        setState(prev => ({
            ...prev,
            filters: { ...prev.filters, ...filters },
        }));
    }, []);
    /**
     * Update selection - merges with existing selection
     */
    const setSelection = (0, react_1.useCallback)((selection) => {
        setState(prev => ({
            ...prev,
            selection: { ...prev.selection, ...selection },
        }));
    }, []);
    /**
     * Clear all selections across all panes
     */
    const resetSelection = (0, react_1.useCallback)(() => {
        setState(prev => ({
            ...prev,
            selection: {
                selectedEntityIds: [],
                selectedEventIds: [],
                selectedLocationIds: [],
            },
        }));
    }, []);
    /**
     * Reset filters to initial state
     */
    const resetFilters = (0, react_1.useCallback)(() => {
        setState(prev => ({
            ...prev,
            filters: initialStateRef.current.filters,
        }));
    }, []);
    /**
     * Reset everything to initial state
     */
    const resetAll = (0, react_1.useCallback)(() => {
        setState({
            ...initialStateRef.current,
            timeWindowSeq: (state.timeWindowSeq || 0) + 1 // Keep sequence moving forward even on reset
        });
    }, [state.timeWindowSeq]);
    // Memoize context value to prevent unnecessary re-renders
    const value = (0, react_1.useMemo)(() => ({
        state,
        setTimeWindow,
        setFilters,
        setSelection,
        resetSelection,
        resetFilters,
        resetAll,
    }), [
        state,
        setTimeWindow,
        setFilters,
        setSelection,
        resetSelection,
        resetFilters,
        resetAll,
    ]);
    return (<AnalystViewContext.Provider value={value}>
      {children}
    </AnalystViewContext.Provider>);
}
// =============================================================================
// Core Hook
// =============================================================================
/**
 * Main hook to access the analyst view context
 * @throws Error if used outside of AnalystViewProvider
 */
function useAnalystView() {
    const ctx = (0, react_1.useContext)(AnalystViewContext);
    if (!ctx) {
        throw new Error('useAnalystView must be used within AnalystViewProvider');
    }
    return ctx;
}
// =============================================================================
// Convenience Hooks
// =============================================================================
/**
 * Hook for time brush functionality - get and set the global time window
 */
function useGlobalTimeBrush() {
    const { state, setTimeWindow } = useAnalystView();
    return {
        timeWindow: state.timeWindow,
        timeWindowSeq: state.timeWindowSeq,
        setTimeWindow,
    };
}
/**
 * Hook for selection management across all panes
 */
function useSelection() {
    const { state, setSelection, resetSelection } = useAnalystView();
    return {
        selection: state.selection,
        setSelection,
        resetSelection,
        // Convenience methods for common selection operations
        selectEntity: (entityId) => {
            setSelection({
                selectedEntityIds: [
                    ...state.selection.selectedEntityIds.filter(id => id !== entityId),
                    entityId,
                ],
            });
        },
        deselectEntity: (entityId) => {
            setSelection({
                selectedEntityIds: state.selection.selectedEntityIds.filter(id => id !== entityId),
            });
        },
        toggleEntitySelection: (entityId) => {
            const isSelected = state.selection.selectedEntityIds.includes(entityId);
            if (isSelected) {
                setSelection({
                    selectedEntityIds: state.selection.selectedEntityIds.filter(id => id !== entityId),
                });
            }
            else {
                setSelection({
                    selectedEntityIds: [...state.selection.selectedEntityIds, entityId],
                });
            }
        },
        selectEvent: (eventId) => {
            setSelection({
                selectedEventIds: [
                    ...state.selection.selectedEventIds.filter(id => id !== eventId),
                    eventId,
                ],
            });
        },
        selectLocation: (locationId) => {
            setSelection({
                selectedLocationIds: [
                    ...state.selection.selectedLocationIds.filter(id => id !== locationId),
                    locationId,
                ],
            });
        },
        isEntitySelected: (entityId) => state.selection.selectedEntityIds.includes(entityId),
        isEventSelected: (eventId) => state.selection.selectedEventIds.includes(eventId),
        isLocationSelected: (locationId) => state.selection.selectedLocationIds.includes(locationId),
    };
}
/**
 * Hook for filter management
 */
function useViewFilters() {
    const { state, setFilters, resetFilters } = useAnalystView();
    return {
        filters: state.filters,
        setFilters,
        resetFilters,
        // Convenience methods for common filter operations
        setEntityTypeFilter: (types) => {
            setFilters({ entityTypes: types });
        },
        setEventTypeFilter: (types) => {
            setFilters({ eventTypes: types });
        },
        setMinConfidence: (minConfidence) => {
            setFilters({ minConfidence });
        },
        clearEntityTypeFilter: () => {
            setFilters({ entityTypes: undefined });
        },
        clearEventTypeFilter: () => {
            setFilters({ eventTypes: undefined });
        },
    };
}
/**
 * Hook to get current view state (read-only access)
 */
function useViewState() {
    const { state } = useAnalystView();
    return state;
}
// =============================================================================
// Helper: Create Default Initial State
// =============================================================================
/**
 * Creates a default initial state with sensible defaults
 */
function createDefaultViewState(overrides) {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
        timeWindow: (0, timeWindow_1.fromIsoWindow)(oneWeekAgo.toISOString(), now.toISOString()),
        timeWindowSeq: 0,
        filters: {
            entityTypes: [],
            eventTypes: [],
            locationCountries: [],
            minConfidence: undefined,
            tags: [],
        },
        selection: {
            selectedEntityIds: [],
            selectedEventIds: [],
            selectedLocationIds: [],
        },
        ...overrides,
    };
}
