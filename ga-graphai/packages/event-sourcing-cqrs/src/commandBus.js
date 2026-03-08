"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandBus = void 0;
const eventStore_js_1 = require("./eventStore.js");
class CommandBus {
    eventStore;
    eventBus;
    snapshotStore;
    handlers = new Map();
    constructor(eventStore, eventBus, snapshotStore) {
        this.eventStore = eventStore;
        this.eventBus = eventBus;
        this.snapshotStore = snapshotStore;
    }
    register(commandType, handler) {
        this.handlers.set(commandType, handler);
    }
    async dispatch(command) {
        const handler = this.handlers.get(command.type);
        if (!handler) {
            throw new Error(`No handler registered for ${command.type}`);
        }
        const history = await this.eventStore.loadStream(command.streamId);
        const snapshot = this.snapshotStore
            ? await this.snapshotStore.getLatest(command.streamId)
            : undefined;
        const result = await handler(command, { history, snapshot });
        if (!result.events.length) {
            return [];
        }
        const lastVersion = history.at(-1)?.version ?? -1;
        const expectedVersion = command.expectedVersion ?? lastVersion;
        if (expectedVersion !== lastVersion) {
            throw new eventStore_js_1.ConcurrencyError(`Optimistic concurrency check failed for ${command.streamId}`);
        }
        const envelopes = await this.eventStore.append(command.streamId, result.events, expectedVersion);
        if (result.snapshot && this.snapshotStore) {
            const finalVersion = envelopes.at(-1)?.version ?? lastVersion;
            await this.snapshotStore.save({
                ...result.snapshot,
                streamId: command.streamId,
                version: finalVersion,
                takenAt: result.snapshot.takenAt ?? new Date().toISOString(),
            });
        }
        await this.eventBus.publish(envelopes);
        return envelopes;
    }
}
exports.CommandBus = CommandBus;
