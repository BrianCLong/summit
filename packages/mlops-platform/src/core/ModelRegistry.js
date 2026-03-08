"use strict";
/**
 * Model Registry
 * Central registry for ML models with versioning and metadata management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelRegistry = void 0;
const events_1 = require("events");
class ModelRegistry extends events_1.EventEmitter {
    config;
    models;
    constructor(config) {
        super();
        this.config = config;
        this.models = new Map();
    }
    /**
     * Register a new model
     */
    async registerModel(metadata) {
        const id = this.generateModelId();
        const now = new Date();
        const model = {
            ...metadata,
            id,
            createdAt: now,
            updatedAt: now,
        };
        this.models.set(id, model);
        this.emit('model:registered', model);
        return model;
    }
    /**
     * Get model by ID
     */
    async getModel(id) {
        return this.models.get(id) || null;
    }
    /**
     * Get model by name and version
     */
    async getModelByVersion(name, version) {
        for (const model of this.models.values()) {
            if (model.name === name && model.version === version) {
                return model;
            }
        }
        return null;
    }
    /**
     * List all versions of a model
     */
    async listModelVersions(name) {
        const versions = [];
        for (const model of this.models.values()) {
            if (model.name === name) {
                versions.push(model);
            }
        }
        return versions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    /**
     * Search models
     */
    async searchModels(query) {
        let results = Array.from(this.models.values());
        if (query.name) {
            results = results.filter(m => m.name.includes(query.name));
        }
        if (query.framework) {
            results = results.filter(m => m.framework === query.framework);
        }
        if (query.type) {
            results = results.filter(m => m.type === query.type);
        }
        if (query.status) {
            results = results.filter(m => m.status === query.status);
        }
        if (query.tags && query.tags.length > 0) {
            results = results.filter(m => query.tags.some(tag => m.tags.includes(tag)));
        }
        if (query.author) {
            results = results.filter(m => m.author === query.author);
        }
        return results;
    }
    /**
     * Update model metadata
     */
    async updateModel(id, updates) {
        const model = this.models.get(id);
        if (!model) {
            return null;
        }
        const updated = {
            ...model,
            ...updates,
            id: model.id, // Preserve ID
            createdAt: model.createdAt, // Preserve creation time
            updatedAt: new Date(),
        };
        this.models.set(id, updated);
        this.emit('model:updated', updated);
        return updated;
    }
    /**
     * Update model status
     */
    async updateModelStatus(id, status) {
        return this.updateModel(id, { status });
    }
    /**
     * Add deployment to model
     */
    async addDeployment(id, deployment) {
        const model = this.models.get(id);
        if (!model) {
            return null;
        }
        const deployments = [
            ...model.deployments,
            {
                ...deployment,
                deployedAt: new Date(),
            },
        ];
        return this.updateModel(id, { deployments });
    }
    /**
     * Delete model
     */
    async deleteModel(id) {
        const model = this.models.get(id);
        if (!model) {
            return false;
        }
        this.models.delete(id);
        this.emit('model:deleted', model);
        return true;
    }
    /**
     * Get model lineage
     */
    async getModelLineage(id) {
        const model = this.models.get(id);
        if (!model) {
            return null;
        }
        // In a real implementation, this would track parent-child relationships
        return {
            model,
            predecessors: [],
            successors: [],
        };
    }
    /**
     * Validate model artifact
     */
    async validateArtifact(id) {
        const model = this.models.get(id);
        if (!model) {
            return {
                valid: false,
                errors: ['Model not found'],
            };
        }
        const errors = [];
        // Check artifact exists
        if (!model.artifactUri) {
            errors.push('Artifact URI not specified');
        }
        // Check checksum
        if (!model.checksum) {
            errors.push('Checksum not available');
        }
        // In a real implementation, would verify artifact integrity
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    /**
     * Compare model versions
     */
    async compareVersions(id1, id2) {
        const model1 = this.models.get(id1);
        const model2 = this.models.get(id2);
        if (!model1 || !model2) {
            return null;
        }
        const differences = [];
        // Compare key fields
        const fieldsToCompare = [
            'framework',
            'type',
            'status',
            'size',
        ];
        for (const field of fieldsToCompare) {
            if (model1[field] !== model2[field]) {
                differences.push({
                    field,
                    value1: model1[field],
                    value2: model2[field],
                });
            }
        }
        // Compare metrics
        const metricsDiff = {};
        if (model1.metrics && model2.metrics) {
            const allMetrics = new Set([
                ...Object.keys(model1.metrics),
                ...Object.keys(model2.metrics),
            ]);
            for (const metric of allMetrics) {
                const val1 = model1.metrics[metric] || 0;
                const val2 = model2.metrics[metric] || 0;
                metricsDiff[metric] = val2 - val1;
            }
        }
        return {
            model1,
            model2,
            differences,
            metricsDiff,
        };
    }
    /**
     * Get production models
     */
    async getProductionModels() {
        return Array.from(this.models.values()).filter(m => m.status === 'production');
    }
    /**
     * Archive old models
     */
    async archiveOldModels(olderThanDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
        let archivedCount = 0;
        for (const model of this.models.values()) {
            if (model.createdAt < cutoffDate &&
                model.status !== 'production' &&
                model.status !== 'staging') {
                await this.updateModelStatus(model.id, 'archived');
                archivedCount++;
            }
        }
        return archivedCount;
    }
    generateModelId() {
        return `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.ModelRegistry = ModelRegistry;
