"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemorySnapshotStore = void 0;
class InMemorySnapshotStore {
    snapshots = new Map();
    async getLatest(streamId) {
        return this.snapshots.get(streamId) ?? null;
    }
    async save(snapshot) {
        this.snapshots.set(snapshot.streamId, snapshot);
    }
}
exports.InMemorySnapshotStore = InMemorySnapshotStore;
