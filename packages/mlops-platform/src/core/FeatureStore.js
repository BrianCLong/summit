"use strict";
/**
 * Feature Store
 * Online and offline feature storage with versioning and lineage tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureStore = void 0;
const events_1 = require("events");
class FeatureStore extends events_1.EventEmitter {
    config;
    features;
    onlineStore; // entityId -> values
    offlineStore; // for historical data
    constructor(config) {
        super();
        this.config = config;
        this.features = new Map();
        this.onlineStore = new Map();
        this.offlineStore = new Map();
    }
    /**
     * Register a feature
     */
    async registerFeature(feature) {
        const id = this.generateFeatureId();
        const now = new Date();
        const fullFeature = {
            ...feature,
            id,
            createdAt: now,
            updatedAt: now,
        };
        this.features.set(id, fullFeature);
        this.emit('feature:registered', fullFeature);
        return fullFeature;
    }
    /**
     * Get feature definition
     */
    async getFeature(id) {
        return this.features.get(id) || null;
    }
    /**
     * Get feature by name
     */
    async getFeatureByName(name) {
        for (const feature of this.features.values()) {
            if (feature.name === name) {
                return feature;
            }
        }
        return null;
    }
    /**
     * List features in a feature group
     */
    async listFeatureGroup(groupName) {
        return Array.from(this.features.values()).filter(f => f.featureGroup === groupName);
    }
    /**
     * Write feature value to online store
     */
    async writeOnline(entityId, featureId, value, timestamp) {
        const feature = this.features.get(featureId);
        if (!feature) {
            throw new Error(`Feature ${featureId} not found`);
        }
        const featureValue = {
            featureId,
            entityId,
            value,
            timestamp: timestamp || new Date(),
            version: feature.version,
        };
        const key = this.getOnlineKey(entityId, featureId);
        const existing = this.onlineStore.get(key) || [];
        existing.push(featureValue);
        // Apply TTL if configured
        if (this.config.online.ttl) {
            const cutoff = new Date(Date.now() - this.config.online.ttl * 1000);
            const filtered = existing.filter(v => v.timestamp > cutoff);
            this.onlineStore.set(key, filtered);
        }
        else {
            // Keep only latest value
            this.onlineStore.set(key, [featureValue]);
        }
        this.emit('feature:written', { entityId, featureId, value });
    }
    /**
     * Write feature value to offline store
     */
    async writeOffline(entityId, featureId, value, timestamp) {
        const feature = this.features.get(featureId);
        if (!feature) {
            throw new Error(`Feature ${featureId} not found`);
        }
        const featureValue = {
            featureId,
            entityId,
            value,
            timestamp,
            version: feature.version,
        };
        const key = this.getOfflineKey(entityId, featureId);
        const existing = this.offlineStore.get(key) || [];
        existing.push(featureValue);
        this.offlineStore.set(key, existing);
        this.emit('feature:written-offline', { entityId, featureId, value, timestamp });
    }
    /**
     * Read latest feature value from online store
     */
    async readOnline(entityId, featureId) {
        const key = this.getOnlineKey(entityId, featureId);
        const values = this.onlineStore.get(key);
        if (!values || values.length === 0) {
            return null;
        }
        // Return latest value
        return values[values.length - 1].value;
    }
    /**
     * Read feature vector (multiple features for an entity)
     */
    async readFeatureVector(entityId, featureIds) {
        const features = {};
        for (const featureId of featureIds) {
            const value = await this.readOnline(entityId, featureId);
            const feature = this.features.get(featureId);
            if (feature) {
                features[feature.name] = value;
            }
        }
        return {
            entityId,
            features,
            timestamp: new Date(),
        };
    }
    /**
     * Point-in-time query for historical features
     */
    async pointInTimeQuery(query) {
        const results = [];
        for (const entityId of query.entityIds) {
            const features = {};
            for (const featureName of query.featureNames) {
                const feature = await this.getFeatureByName(featureName);
                if (!feature) {
                    continue;
                }
                const key = this.getOfflineKey(entityId, feature.id);
                const values = this.offlineStore.get(key) || [];
                // Find value closest to but not after query timestamp
                const relevantValues = values
                    .filter(v => v.timestamp <= query.timestamp)
                    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
                if (relevantValues.length > 0) {
                    features[featureName] = relevantValues[0].value;
                }
            }
            results.push({
                entityId,
                features,
                timestamp: query.timestamp,
            });
        }
        return results;
    }
    /**
     * Batch write features
     */
    async batchWrite(writes) {
        for (const write of writes) {
            for (const [featureName, value] of Object.entries(write.features)) {
                const feature = await this.getFeatureByName(featureName);
                if (feature) {
                    await this.writeOnline(write.entityId, feature.id, value, write.timestamp);
                    if (this.config.offline.enabled) {
                        await this.writeOffline(write.entityId, feature.id, value, write.timestamp || new Date());
                    }
                }
            }
        }
    }
    /**
     * Batch read features
     */
    async batchRead(entityIds, featureIds) {
        const results = [];
        for (const entityId of entityIds) {
            const vector = await this.readFeatureVector(entityId, featureIds);
            results.push(vector);
        }
        return results;
    }
    /**
     * Compute feature statistics
     */
    async computeStatistics(featureId) {
        const feature = this.features.get(featureId);
        if (!feature) {
            throw new Error(`Feature ${featureId} not found`);
        }
        const allValues = [];
        // Collect all values from offline store
        for (const values of this.offlineStore.values()) {
            const featureValues = values
                .filter(v => v.featureId === featureId)
                .map(v => v.value);
            allValues.push(...featureValues.filter(v => typeof v === 'number'));
        }
        if (allValues.length === 0) {
            return undefined;
        }
        const sorted = allValues.sort((a, b) => a - b);
        const sum = allValues.reduce((a, b) => a + b, 0);
        const mean = sum / allValues.length;
        const variance = allValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
            allValues.length;
        const stddev = Math.sqrt(variance);
        const statistics = {
            min: sorted[0],
            max: sorted[sorted.length - 1],
            mean,
            stddev,
            distinctCount: new Set(allValues).size,
        };
        // Update feature with statistics
        await this.updateFeature(featureId, { statistics });
        return statistics;
    }
    /**
     * Materialize features
     */
    async materializeFeatures(featureGroupName, startTime, endTime) {
        const features = await this.listFeatureGroup(featureGroupName);
        this.emit('materialization:started', {
            featureGroup: featureGroupName,
            featureCount: features.length,
        });
        // In a real implementation, this would:
        // 1. Query the data sources
        // 2. Apply transformations
        // 3. Write to offline store
        // 4. Update online store if needed
        this.emit('materialization:completed', {
            featureGroup: featureGroupName,
        });
    }
    /**
     * Validate feature constraints
     */
    async validateConstraints(featureId, value) {
        const feature = this.features.get(featureId);
        if (!feature) {
            return { valid: false, violations: ['Feature not found'] };
        }
        const violations = [];
        for (const constraint of feature.constraints) {
            switch (constraint.type) {
                case 'range':
                    if (typeof value === 'number' &&
                        (value < constraint.config.min || value > constraint.config.max)) {
                        violations.push(`Value ${value} outside range [${constraint.config.min}, ${constraint.config.max}]`);
                    }
                    break;
                case 'not-null':
                    if (value === null || value === undefined) {
                        violations.push('Value cannot be null');
                    }
                    break;
                case 'enum':
                    if (!constraint.config.values.includes(value)) {
                        violations.push(`Value ${value} not in allowed values: ${constraint.config.values.join(', ')}`);
                    }
                    break;
            }
        }
        return {
            valid: violations.length === 0,
            violations,
        };
    }
    /**
     * Get feature lineage
     */
    async getFeatureLineage(featureId) {
        const feature = this.features.get(featureId);
        if (!feature) {
            return null;
        }
        // In a real implementation, this would track feature dependencies
        return {
            feature,
            dependencies: [],
            dependents: [],
        };
    }
    /**
     * Update feature
     */
    async updateFeature(id, updates) {
        const feature = this.features.get(id);
        if (!feature) {
            return null;
        }
        const updated = {
            ...feature,
            ...updates,
            id: feature.id,
            createdAt: feature.createdAt,
            updatedAt: new Date(),
        };
        this.features.set(id, updated);
        this.emit('feature:updated', updated);
        return updated;
    }
    /**
     * Delete feature
     */
    async deleteFeature(id) {
        const feature = this.features.get(id);
        if (!feature) {
            return false;
        }
        this.features.delete(id);
        // Clean up stores
        const keysToDelete = [];
        for (const key of this.onlineStore.keys()) {
            if (key.includes(id)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.onlineStore.delete(key));
        this.emit('feature:deleted', feature);
        return true;
    }
    getOnlineKey(entityId, featureId) {
        return `${entityId}:${featureId}`;
    }
    getOfflineKey(entityId, featureId) {
        return `${entityId}:${featureId}`;
    }
    generateFeatureId() {
        return `feature-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.FeatureStore = FeatureStore;
