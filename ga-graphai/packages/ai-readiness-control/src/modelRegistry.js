"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelRegistry = void 0;
class ModelRegistry {
    models = new Map();
    register(model) {
        const versions = this.models.get(model.modelId) ?? [];
        if (versions.some((existing) => existing.version === model.version)) {
            throw new Error(`Model ${model.modelId} already has version ${model.version}`);
        }
        this.models.set(model.modelId, [...versions, model]);
    }
    latest(modelId) {
        const versions = this.models.get(modelId) ?? [];
        return versions.sort((a, b) => a.version.localeCompare(b.version)).at(-1);
    }
    rollback(modelId, version, reason) {
        const versions = this.models.get(modelId) ?? [];
        const found = versions.find((candidate) => candidate.version === version);
        if (!found) {
            throw new Error(`Model ${modelId}@${version} not registered`);
        }
        found.rolledBack = true;
        found.rollbackReason = reason;
    }
    list() {
        return Array.from(this.models.values()).flat();
    }
}
exports.ModelRegistry = ModelRegistry;
