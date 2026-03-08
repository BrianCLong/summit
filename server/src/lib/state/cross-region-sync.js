"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossRegionSyncService = exports.MockMessageBroker = void 0;
const events_1 = require("events");
const conflict_resolver_js_1 = require("./conflict-resolver.js");
class MockMessageBroker {
    listeners = new Map();
    async publish(channel, message) {
        const callbacks = this.listeners.get(channel) || [];
        callbacks.forEach(cb => cb(message));
    }
    async subscribe(channel, callback) {
        if (!this.listeners.has(channel)) {
            this.listeners.set(channel, []);
        }
        this.listeners.get(channel)?.push(callback);
    }
}
exports.MockMessageBroker = MockMessageBroker;
/**
 * Service to synchronize CRDT state across regions.
 */
class CrossRegionSyncService extends events_1.EventEmitter {
    broker;
    regionId;
    crdts = new Map();
    factories = new Map();
    constructor(regionId, broker) {
        super();
        this.regionId = regionId;
        this.broker = broker;
        this.broker.subscribe('global-sync', (msg) => this.handleSyncMessage(msg));
    }
    registerCRDT(key, crdt, factory) {
        this.crdts.set(key, crdt);
        this.factories.set(key, factory);
    }
    async sync(key) {
        const crdt = this.crdts.get(key);
        if (!crdt)
            throw new Error(`CRDT with key ${key} not found`);
        const serializedState = crdt.toJSON();
        const payload = JSON.stringify({
            originRegion: this.regionId,
            key,
            state: serializedState,
            type: crdt.type // Use static type property for safety
        });
        await this.broker.publish('global-sync', payload);
    }
    getCRDT(key) {
        return this.crdts.get(key);
    }
    handleSyncMessage(message) {
        try {
            const { originRegion, key, state, type } = JSON.parse(message);
            if (originRegion === this.regionId)
                return;
            const localCRDT = this.crdts.get(key);
            const factory = this.factories.get(key);
            if (localCRDT && factory) {
                let remoteCRDT;
                // Use the static type property instead of constructor.name
                if (type === conflict_resolver_js_1.GCounter.type) {
                    remoteCRDT = conflict_resolver_js_1.GCounter.fromJSON(state);
                }
                else if (type === conflict_resolver_js_1.PNCounter.type) {
                    remoteCRDT = conflict_resolver_js_1.PNCounter.fromJSON(state);
                }
                else if (type === conflict_resolver_js_1.LWWRegister.type) {
                    remoteCRDT = conflict_resolver_js_1.LWWRegister.fromJSON(state);
                }
                else if (type === conflict_resolver_js_1.ORSet.type) {
                    remoteCRDT = conflict_resolver_js_1.ORSet.fromJSON(state);
                }
                if (remoteCRDT) {
                    const merged = localCRDT.merge(remoteCRDT);
                    this.crdts.set(key, merged);
                    this.emit('merged', { key, newState: merged.value, originRegion });
                }
            }
        }
        catch (err) {
            console.error(`[${this.regionId}] Error handling sync message:`, err);
        }
    }
}
exports.CrossRegionSyncService = CrossRegionSyncService;
