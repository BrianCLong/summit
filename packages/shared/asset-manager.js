"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetManager = void 0;
const events_1 = require("events");
const DEFAULT_HISTORY_LIMIT = 50;
class AssetManager extends events_1.EventEmitter {
    assets = new Map();
    domainIndex = new Map();
    dependencies = new Map();
    dependents = new Map();
    usageHistoryLimit;
    constructor(options) {
        super();
        this.usageHistoryLimit =
            options?.usageHistoryLimit ?? DEFAULT_HISTORY_LIMIT;
    }
    registerAsset(input) {
        const now = new Date();
        const existing = this.assets.get(input.id);
        if (existing) {
            const updated = {
                ...existing,
                name: input.name ?? existing.name,
                type: input.type ?? existing.type,
                domain: input.domain ?? existing.domain,
                owners: this.mergeStringArrays(existing.owners, input.owners),
                tags: this.mergeStringArrays(existing.tags, input.tags),
                dependencies: this.mergeDependencies(existing.dependencies, input.dependencies),
                lifecycle: input.lifecycle ?? existing.lifecycle,
                metadata: { ...existing.metadata, ...(input.metadata ?? {}) },
                status: input.status ?? existing.status,
                criticality: input.criticality ?? existing.criticality,
                healthScore: input.healthScore ?? existing.healthScore,
                updatedAt: now,
            };
            this.assets.set(updated.id, updated);
            this.indexAsset(updated, existing.domain !== updated.domain ? existing.domain : undefined);
            this.updateDependencyIndex(updated.id, updated.dependencies);
            this.emit('asset-updated', updated);
            return updated;
        }
        const record = {
            id: input.id,
            name: input.name,
            type: input.type,
            domain: input.domain,
            owners: [...(input.owners ?? [])],
            tags: Array.from(new Set(input.tags ?? [])),
            dependencies: Array.from(new Set(input.dependencies ?? [])),
            lifecycle: input.lifecycle ?? [],
            metadata: input.metadata ?? {},
            usage: [],
            createdAt: now,
            updatedAt: now,
            status: input.status ?? 'active',
            criticality: input.criticality ?? 'medium',
            healthScore: input.healthScore ?? 100,
        };
        this.assets.set(record.id, record);
        this.indexAsset(record);
        this.updateDependencyIndex(record.id, record.dependencies);
        this.emit('asset-registered', record);
        return record;
    }
    bulkUpsert(inputs) {
        return inputs.map((input) => this.registerAsset(input));
    }
    updateAsset(id, updates) {
        const asset = this.assets.get(id);
        if (!asset) {
            return undefined;
        }
        const now = new Date();
        const originalDomain = asset.domain;
        if (updates.name)
            asset.name = updates.name;
        if (updates.type)
            asset.type = updates.type;
        if (updates.domain)
            asset.domain = updates.domain;
        if (updates.owners)
            asset.owners = Array.from(new Set(updates.owners));
        if (updates.tags)
            asset.tags = Array.from(new Set(updates.tags));
        if (updates.dependencies) {
            asset.dependencies = Array.from(new Set(updates.dependencies));
            this.updateDependencyIndex(id, asset.dependencies);
        }
        if (updates.lifecycle)
            asset.lifecycle = updates.lifecycle;
        if (updates.status)
            asset.status = updates.status;
        if (updates.criticality)
            asset.criticality = updates.criticality;
        if (typeof updates.healthScore === 'number')
            asset.healthScore = updates.healthScore;
        if (updates.metadata) {
            asset.metadata = { ...asset.metadata, ...updates.metadata };
        }
        asset.updatedAt = now;
        this.assets.set(id, asset);
        this.indexAsset(asset, originalDomain !== asset.domain ? originalDomain : undefined);
        this.emit('asset-updated', asset);
        return asset;
    }
    recordUsage(assetId, event) {
        const asset = this.assets.get(assetId);
        if (!asset) {
            return;
        }
        const usageEvent = {
            ...event,
            timestamp: event.timestamp ?? new Date(),
        };
        asset.usage.push(usageEvent);
        if (asset.usage.length > this.usageHistoryLimit) {
            asset.usage.splice(0, asset.usage.length - this.usageHistoryLimit);
        }
        asset.updatedAt = usageEvent.timestamp ?? new Date();
        this.assets.set(assetId, asset);
        this.emit('asset-usage-recorded', { assetId, event: usageEvent });
    }
    linkDependency(assetId, dependencyId) {
        const asset = this.assets.get(assetId);
        if (!asset) {
            return;
        }
        if (!asset.dependencies.includes(dependencyId)) {
            asset.dependencies.push(dependencyId);
            this.updateDependencyIndex(assetId, asset.dependencies);
            asset.updatedAt = new Date();
            this.assets.set(assetId, asset);
        }
        if (!this.dependents.has(dependencyId)) {
            this.dependents.set(dependencyId, new Set());
        }
        this.dependents.get(dependencyId).add(assetId);
    }
    unlinkDependency(assetId, dependencyId) {
        const asset = this.assets.get(assetId);
        if (!asset) {
            return;
        }
        asset.dependencies = asset.dependencies.filter((dep) => dep !== dependencyId);
        this.updateDependencyIndex(assetId, asset.dependencies);
        this.assets.set(assetId, asset);
        const dependents = this.dependents.get(dependencyId);
        if (dependents) {
            dependents.delete(assetId);
            if (dependents.size === 0) {
                this.dependents.delete(dependencyId);
            }
        }
    }
    getAsset(id) {
        const asset = this.assets.get(id);
        if (!asset) {
            return undefined;
        }
        return {
            ...asset,
            owners: [...asset.owners],
            tags: [...asset.tags],
            dependencies: [...asset.dependencies],
            usage: [...asset.usage],
        };
    }
    listAssets(filter) {
        let assets = Array.from(this.assets.values());
        if (filter?.domain) {
            const domainIds = this.domainIndex.get(filter.domain);
            if (!domainIds) {
                return [];
            }
            assets = assets.filter((asset) => domainIds.has(asset.id));
        }
        if (filter?.status) {
            assets = assets.filter((asset) => asset.status === filter.status);
        }
        if (filter?.criticality) {
            assets = assets.filter((asset) => asset.criticality === filter.criticality);
        }
        if (filter?.tag) {
            assets = assets.filter((asset) => asset.tags.includes(filter.tag));
        }
        return assets.map((asset) => ({
            ...asset,
            owners: [...asset.owners],
            tags: [...asset.tags],
            dependencies: [...asset.dependencies],
            usage: [...asset.usage],
        }));
    }
    getUsageHistory(assetId, limit = this.usageHistoryLimit) {
        const asset = this.assets.get(assetId);
        if (!asset) {
            return [];
        }
        return asset.usage.slice(Math.max(0, asset.usage.length - limit));
    }
    getDomainSummary(domain) {
        const domainIds = this.domainIndex.get(domain);
        if (!domainIds || domainIds.size === 0) {
            return undefined;
        }
        const byStatus = {
            active: 0,
            in_migration: 0,
            degraded: 0,
            retired: 0,
        };
        const byCriticality = {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0,
        };
        let healthAccumulator = 0;
        let healthCount = 0;
        for (const id of domainIds.values()) {
            const asset = this.assets.get(id);
            if (!asset) {
                continue;
            }
            byStatus[asset.status] += 1;
            byCriticality[asset.criticality] += 1;
            if (typeof asset.healthScore === 'number') {
                healthAccumulator += asset.healthScore;
                healthCount += 1;
            }
        }
        return {
            domain,
            total: domainIds.size,
            byStatus,
            byCriticality,
            averageHealth: healthCount > 0
                ? Math.round((healthAccumulator / healthCount) * 100) / 100
                : null,
            updatedAt: new Date(),
        };
    }
    getDependencyGraph(assetId) {
        if (!this.assets.has(assetId)) {
            return undefined;
        }
        return {
            assetId,
            dependencies: Array.from(this.dependencies.get(assetId) ?? []),
            dependents: Array.from(this.dependents.get(assetId) ?? []),
        };
    }
    indexAsset(asset, previousDomain) {
        if (previousDomain && this.domainIndex.has(previousDomain)) {
            const previousSet = this.domainIndex.get(previousDomain);
            previousSet.delete(asset.id);
            if (previousSet.size === 0) {
                this.domainIndex.delete(previousDomain);
            }
        }
        if (!this.domainIndex.has(asset.domain)) {
            this.domainIndex.set(asset.domain, new Set());
        }
        this.domainIndex.get(asset.domain).add(asset.id);
    }
    updateDependencyIndex(assetId, dependencies) {
        this.dependencies.set(assetId, new Set(dependencies));
        for (const dependency of dependencies) {
            if (!this.dependents.has(dependency)) {
                this.dependents.set(dependency, new Set());
            }
            this.dependents.get(dependency).add(assetId);
        }
    }
    mergeStringArrays(current, incoming) {
        if (!incoming || incoming.length === 0) {
            return current;
        }
        return Array.from(new Set([...current, ...incoming]));
    }
    mergeDependencies(current, incoming) {
        if (!incoming || incoming.length === 0) {
            return current;
        }
        return Array.from(new Set([...current, ...incoming]));
    }
}
exports.AssetManager = AssetManager;
exports.default = AssetManager;
