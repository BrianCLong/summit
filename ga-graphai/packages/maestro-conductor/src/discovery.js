"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetDiscoveryEngine = void 0;
const node_events_1 = require("node:events");
function toComparable(asset) {
    const clone = { ...asset };
    delete clone.lastSeen;
    return JSON.stringify(clone);
}
class AssetDiscoveryEngine {
    providers = new Map();
    registry = new Map();
    providerAssets = new Map();
    assetSources = new Map();
    emitter = new node_events_1.EventEmitter();
    registerProvider(provider) {
        this.providers.set(provider.id, provider);
    }
    removeProvider(providerId) {
        this.providers.delete(providerId);
        const seen = this.providerAssets.get(providerId);
        if (!seen) {
            return;
        }
        for (const assetId of seen) {
            this.removeSource(assetId, providerId);
        }
        this.providerAssets.delete(providerId);
    }
    on(event, listener) {
        this.emitter.on(event, listener);
    }
    off(event, listener) {
        this.emitter.off(event, listener);
    }
    listAssets() {
        return [...this.registry.values()].sort((a, b) => a.id.localeCompare(b.id));
    }
    getAsset(assetId) {
        return this.registry.get(assetId);
    }
    async scanAndRegister() {
        const events = [];
        for (const provider of this.providers.values()) {
            const assets = await provider.scan();
            const seen = new Set();
            for (const asset of assets) {
                seen.add(asset.id);
                events.push(...this.upsert(asset, provider.id));
            }
            const previous = this.providerAssets.get(provider.id) ?? new Set();
            for (const assetId of previous) {
                if (!seen.has(assetId)) {
                    this.removeSource(assetId, provider.id);
                }
            }
            this.providerAssets.set(provider.id, seen);
        }
        return events;
    }
    upsert(asset, providerId) {
        const now = new Date();
        const existing = this.registry.get(asset.id);
        const next = { ...asset, lastSeen: now };
        const events = [];
        this.addSource(asset.id, providerId);
        if (!existing) {
            this.registry.set(asset.id, next);
            events.push(this.emitEvent('registered', next));
            return events;
        }
        const previousComparable = toComparable(existing);
        const nextComparable = toComparable(next);
        if (previousComparable !== nextComparable) {
            this.registry.set(asset.id, next);
            events.push(this.emitEvent('updated', next, existing));
        }
        else {
            this.registry.set(asset.id, next);
        }
        return events;
    }
    addSource(assetId, providerId) {
        const sources = this.assetSources.get(assetId) ?? new Set();
        sources.add(providerId);
        this.assetSources.set(assetId, sources);
    }
    removeSource(assetId, providerId) {
        const sources = this.assetSources.get(assetId);
        if (!sources) {
            return;
        }
        sources.delete(providerId);
        if (sources.size === 0) {
            this.assetSources.delete(assetId);
            const existing = this.registry.get(assetId);
            if (existing) {
                this.registry.delete(assetId);
                this.emitEvent('removed', existing, existing);
            }
        }
        else {
            this.assetSources.set(assetId, sources);
        }
    }
    emitEvent(type, asset, previous) {
        const event = { type, asset, previous };
        this.emitter.emit('event', event);
        return event;
    }
}
exports.AssetDiscoveryEngine = AssetDiscoveryEngine;
