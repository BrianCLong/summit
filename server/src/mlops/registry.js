"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelRegistry = exports.ModelRegistry = void 0;
// @ts-nocheck
const ledger_js_1 = require("../provenance/ledger.js");
const logger_js_1 = require("../config/logger.js");
/**
 * Registry for managing ML model lifecycles.
 * Uses ProvenanceLedger for immutable history and audit trails.
 */
class ModelRegistry {
    static instance;
    constructor() { }
    static getInstance() {
        if (!ModelRegistry.instance) {
            ModelRegistry.instance = new ModelRegistry();
        }
        return ModelRegistry.instance;
    }
    /**
     * Register a new model definition (without versions).
     */
    async registerModel(tenantId, model) {
        const entry = await ledger_js_1.provenanceLedger.appendEntry({
            tenantId,
            actionType: 'REGISTER_MODEL',
            resourceType: 'Model',
            resourceId: `model_${Date.now()}_${model.name}`,
            actorId: 'system',
            actorType: 'user',
            payload: { ...model, versions: [] },
            metadata: { domain: model.domain }
        });
        return entry.resourceId;
    }
    /**
     * Log a new version for an existing model.
     */
    async logModelVersion(tenantId, modelId, version) {
        await ledger_js_1.provenanceLedger.appendEntry({
            tenantId,
            actionType: 'LOG_MODEL_VERSION',
            resourceType: 'ModelVersion',
            resourceId: `${modelId}:${version.version}`,
            actorId: 'system',
            actorType: 'user',
            payload: version,
            metadata: { modelId, version: version.version }
        });
    }
    /**
     * Update the stage of a model version (e.g., Staging -> Production).
     */
    async transitionModelVersionStage(tenantId, modelId, version, stage) {
        await ledger_js_1.provenanceLedger.appendEntry({
            tenantId,
            actionType: 'TRANSITION_MODEL_STAGE',
            resourceType: 'ModelVersion',
            resourceId: `${modelId}:${version}`,
            actorId: 'system',
            actorType: 'user',
            payload: { stage },
            metadata: { modelId, version }
        });
    }
    /**
     * Get the latest version of a model that is in 'production'.
     */
    async getProductionModelVersion(tenantId, modelName) {
        try {
            // Retrieve entries related to transitioning to production
            const entries = await ledger_js_1.provenanceLedger.getEntries(tenantId, {
                actionType: 'TRANSITION_MODEL_STAGE',
                resourceType: 'ModelVersion',
                order: 'DESC',
                limit: 50 // Look at recent transitions
            });
            // Filter for the specific model and stage=production
            // Note: metadata.modelId usually stores the ID, but for this simplified lookup we assume we can match or payload has info
            const prodEntry = entries.find(e => {
                const payload = e.payload;
                const meta = e.metadata;
                return meta.modelId?.includes(modelName) && payload.stage === 'production';
            });
            if (prodEntry) {
                const version = prodEntry.metadata.version;
                // Ideally we'd fetch the full version details, but for now return a stub with the version
                return {
                    version,
                    status: 'production',
                    description: 'Resolved from ledger',
                    tags: [],
                    metrics: {},
                    parameters: {},
                    artifacts: { path: '', format: 'tensorflow', size: 0, checksum: '' },
                    createdAt: prodEntry.timestamp,
                    createdBy: prodEntry.actorId
                };
            }
        }
        catch (e) {
            logger_js_1.logger.error({ error: e }, 'Failed to resolve production model version');
        }
        return null;
    }
}
exports.ModelRegistry = ModelRegistry;
exports.modelRegistry = ModelRegistry.getInstance();
