"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryEventStore = void 0;
class InMemoryEventStore {
    events = [];
    async append(eventData) {
        const event = {
            ...eventData,
            id: crypto.randomUUID(),
            timestamp: new Date(),
        };
        this.events.push(event);
        return event;
    }
    async query(tenantId, filters) {
        return this.events.filter(e => {
            if (e.tenantId !== tenantId)
                return false;
            if (filters) {
                for (const key in filters) {
                    // @ts-ignore
                    if (e[key] !== filters[key])
                        return false;
                }
            }
            return true;
        });
    }
}
exports.InMemoryEventStore = InMemoryEventStore;
