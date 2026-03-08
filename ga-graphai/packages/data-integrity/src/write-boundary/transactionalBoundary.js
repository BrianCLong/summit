"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartialWriteDetector = exports.TransactionalBoundary = exports.InMemoryIntentStore = void 0;
class InMemoryIntentStore {
    intents = new Map();
    async saveIntent(intent) {
        this.intents.set(intent.id, intent);
    }
    async completeIntent(id) {
        const intent = this.intents.get(id);
        if (intent) {
            intent.completed = true;
            this.intents.set(id, intent);
        }
    }
    async listPending(before) {
        return Array.from(this.intents.values()).filter((intent) => !intent.completed && intent.createdAt <= before);
    }
}
exports.InMemoryIntentStore = InMemoryIntentStore;
class TransactionalBoundary {
    adapter;
    intents;
    constructor(adapter, intents) {
        this.adapter = adapter;
        this.intents = intents;
    }
    async execute(options, work) {
        await this.adapter.begin();
        await this.intents.saveIntent({
            id: options.id,
            scope: options.scope,
            createdAt: Date.now(),
        });
        try {
            const result = await work();
            await this.adapter.commit();
            await this.intents.completeIntent(options.id);
            return result;
        }
        catch (error) {
            await this.adapter.rollback();
            throw error;
        }
    }
}
exports.TransactionalBoundary = TransactionalBoundary;
class PartialWriteDetector {
    intents;
    constructor(intents) {
        this.intents = intents;
    }
    async detect(now) {
        return this.intents.listPending(now);
    }
}
exports.PartialWriteDetector = PartialWriteDetector;
