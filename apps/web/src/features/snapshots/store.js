"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSnapshotStore = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
exports.useSnapshotStore = (0, zustand_1.create)()((0, middleware_1.persist)((set, get) => ({
    snapshots: [],
    addSnapshot: (name, data) => set((state) => ({
        snapshots: [
            ...state.snapshots,
            {
                id: crypto.randomUUID(),
                name,
                timestamp: Date.now(),
                data,
            },
        ],
    })),
    removeSnapshot: (id) => set((state) => ({
        snapshots: state.snapshots.filter((s) => s.id !== id),
    })),
    renameSnapshot: (id, newName) => set((state) => ({
        snapshots: state.snapshots.map((s) => s.id === id ? { ...s, name: newName } : s),
    })),
    restoreSnapshot: (id) => get().snapshots.find((s) => s.id === id),
}), {
    name: 'summit-snapshots',
}));
