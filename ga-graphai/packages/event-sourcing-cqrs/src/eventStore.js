"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryEventStore = exports.ConcurrencyError = void 0;
const crypto_1 = require("crypto");
class ConcurrencyError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConcurrencyError';
    }
}
exports.ConcurrencyError = ConcurrencyError;
class InMemoryEventStore {
    streams = new Map();
    async append(streamId, events, expectedVersion = -1) {
        const currentEvents = this.streams.get(streamId) ?? [];
        const lastVersion = currentEvents.at(-1)?.version ?? -1;
        if (expectedVersion !== -2 && expectedVersion !== lastVersion) {
            throw new ConcurrencyError(`Version mismatch for ${streamId}: expected ${expectedVersion}, actual ${lastVersion}`);
        }
        const appended = events.map((event, index) => {
            const version = lastVersion + index + 1;
            return {
                id: (0, crypto_1.randomUUID)(),
                streamId,
                version,
                timestamp: new Date().toISOString(),
                event,
            };
        });
        this.streams.set(streamId, [...currentEvents, ...appended]);
        return appended;
    }
    async loadStream(streamId, fromVersion = 0) {
        const events = this.streams.get(streamId) ?? [];
        return events.filter((event) => event.version >= fromVersion);
    }
    async loadSince(timestamp) {
        const threshold = new Date(timestamp).getTime();
        return Array.from(this.streams.values())
            .flat()
            .filter((entry) => new Date(entry.timestamp).getTime() >= threshold)
            .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }
}
exports.InMemoryEventStore = InMemoryEventStore;
