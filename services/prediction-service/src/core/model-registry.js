"use strict";
/**
 * Model Registry - Model Lifecycle Management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelRegistry = void 0;
class ModelRegistry {
    models = new Map();
    championModels = new Map(); // modelId -> version
    driftHistory = new Map();
    /**
     * Register a new model version
     */
    registerVersion(modelId, version) {
        if (!this.models.has(modelId)) {
            this.models.set(modelId, []);
        }
        const versions = this.models.get(modelId);
        versions.push(version);
        // Set as champion if first version
        if (versions.length === 1) {
            this.championModels.set(modelId, version.version);
        }
    }
    /**
     * Get champion (production) model
     */
    getChampion(modelId) {
        const championVersion = this.championModels.get(modelId);
        if (!championVersion)
            return undefined;
        const versions = this.models.get(modelId);
        return versions?.find(v => v.version === championVersion);
    }
    /**
     * Get specific model version
     */
    getVersion(modelId, version) {
        const versions = this.models.get(modelId);
        return versions?.find(v => v.version === version);
    }
    /**
     * List all versions of a model
     */
    listVersions(modelId) {
        return this.models.get(modelId) || [];
    }
    /**
     * Promote challenger to champion
     */
    promoteToChampion(modelId, version) {
        const modelVersion = this.getVersion(modelId, version);
        if (!modelVersion) {
            throw new Error(`Model version not found: ${modelId}@${version}`);
        }
        this.championModels.set(modelId, version);
    }
    /**
     * Record drift metrics
     */
    recordDrift(modelId, metrics) {
        if (!this.driftHistory.has(modelId)) {
            this.driftHistory.set(modelId, []);
        }
        this.driftHistory.get(modelId).push(metrics);
        // Alert if drift is too high
        if (metrics.dataDrift > 0.25 || metrics.conceptDrift > 0.25) {
            console.warn(`High drift detected for model ${modelId}`, metrics);
        }
    }
    /**
     * Get drift history
     */
    getDriftHistory(modelId) {
        return this.driftHistory.get(modelId) || [];
    }
    /**
     * Check if retraining is needed
     */
    needsRetraining(modelId) {
        const driftHistory = this.getDriftHistory(modelId);
        if (driftHistory.length === 0)
            return false;
        const latestDrift = driftHistory[driftHistory.length - 1];
        return latestDrift.dataDrift > 0.25 ||
            latestDrift.conceptDrift > 0.25 ||
            latestDrift.performanceDrift > 0.15;
    }
}
exports.ModelRegistry = ModelRegistry;
