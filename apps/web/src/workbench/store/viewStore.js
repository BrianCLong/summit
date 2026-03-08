"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWorkbenchStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
exports.useWorkbenchStore = (0, zustand_1.create)()((0, middleware_1.persist)((set, get) => ({
    leftRailOpen: true,
    rightRailOpen: true,
    toggleLeftRail: () => set(state => ({ leftRailOpen: !state.leftRailOpen })),
    toggleRightRail: () => set(state => ({ rightRailOpen: !state.rightRailOpen })),
    selectedEntityIds: [],
    selectEntity: (id, multi = false) => set(state => {
        if (multi) {
            const isSelected = state.selectedEntityIds.includes(id);
            return {
                selectedEntityIds: isSelected
                    ? state.selectedEntityIds.filter(eid => eid !== id)
                    : [...state.selectedEntityIds, id]
            };
        }
        return { selectedEntityIds: [id] };
    }),
    clearSelection: () => set({ selectedEntityIds: [] }),
    filters: {
        nodeTypes: [],
        edgeTypes: [],
        showProvenance: false,
    },
    setFilter: (key, value) => set(state => ({
        filters: { ...state.filters, [key]: value }
    })),
    savedViews: [],
    saveView: (view) => set(state => ({
        savedViews: [...state.savedViews.filter(v => v.id !== view.id), view]
    })),
    deleteView: (id) => set(state => ({
        savedViews: state.savedViews.filter(v => v.id !== id)
    })),
    loadView: (id) => {
        // Implementation would likely be handled by a side-effect or consumer
        console.log('Loading view', id);
    },
}), {
    name: 'workbench-storage',
    partialize: (state) => ({
        savedViews: state.savedViews,
        leftRailOpen: state.leftRailOpen,
        rightRailOpen: state.rightRailOpen,
    }),
}));
