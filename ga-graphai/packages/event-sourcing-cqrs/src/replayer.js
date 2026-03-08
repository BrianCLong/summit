"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventReplayer = void 0;
class EventReplayer {
    eventStore;
    constructor(eventStore) {
        this.eventStore = eventStore;
    }
    async replay({ streamId, projection, snapshotStore }) {
        const snapshot = snapshotStore ? await snapshotStore.getLatest(streamId) : null;
        let fromVersion = 0;
        if (snapshot) {
            projection.apply({
                id: 'snapshot',
                streamId,
                version: snapshot.version,
                timestamp: snapshot.takenAt,
                event: { type: 'snapshot', payload: snapshot.state },
            });
            fromVersion = snapshot.version + 1;
        }
        const events = await this.eventStore.loadStream(streamId, fromVersion);
        for (const event of events) {
            projection.apply(event);
        }
    }
}
exports.EventReplayer = EventReplayer;
