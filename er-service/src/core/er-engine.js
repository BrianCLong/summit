"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EREngine = void 0;
const node_crypto_1 = require("node:crypto");
const types_js_1 = require("../types.js");
const scorer_js_1 = require("../scoring/scorer.js");
const storage_js_1 = require("../storage/storage.js");
/**
 * Main Entity Resolution Engine
 * Orchestrates candidate finding, merging, splitting, and explanations
 */
class EREngine {
    storage;
    config;
    constructor(config = {}, storage) {
        this.config = { ...types_js_1.DEFAULT_SCORING_CONFIG, ...config };
        this.storage = storage || new storage_js_1.ERStorage();
    }
    /**
     * Find candidate matches for an entity
     */
    candidates(request) {
        const startTime = Date.now();
        const requestId = (0, node_crypto_1.randomUUID)();
        // Filter population to same tenant
        const population = request.population.filter(candidate => candidate.tenantId === request.tenantId);
        // Create scorer based on method
        const scoringConfig = {
            ...this.config,
            method: request.method || this.config.method,
            threshold: request.threshold || this.config.threshold,
        };
        const scorer = (0, scorer_js_1.createScorer)(scoringConfig);
        // Score all candidates
        const scored = population
            .filter(candidate => candidate.id !== request.entity.id)
            .map(candidate => scorer.score(request.entity, candidate))
            .filter(result => result.score >= scoringConfig.threshold)
            .sort((a, b) => b.score - a.score)
            .slice(0, request.topK || 5);
        const executionTimeMs = Date.now() - startTime;
        return {
            requestId,
            candidates: scored,
            method: scorer.getMethod(),
            executionTimeMs,
        };
    }
    /**
     * Merge entities
     */
    merge(request) {
        // Validate request
        if (request.entityIds.length < 2) {
            throw new Error('At least 2 entity IDs required for merge');
        }
        // Ensure all entities belong to the same tenant
        const entities = request.entityIds.map(id => {
            const entity = this.storage.getEntity(id);
            if (!entity) {
                throw new Error(`Entity ${id} not found`);
            }
            if (entity.tenantId !== request.tenantId) {
                throw new Error(`Entity ${id} does not belong to tenant ${request.tenantId}`);
            }
            return entity;
        });
        // If no primary specified, use first entity
        const primaryId = request.primaryId || request.entityIds[0];
        const primary = entities.find(e => e.id === primaryId);
        if (!primary) {
            throw new Error(`Primary entity ${primaryId} not found`);
        }
        // Calculate features between primary and each merged entity
        const scorer = (0, scorer_js_1.createScorer)(this.config);
        const scores = entities
            .filter(e => e.id !== primaryId)
            .map(e => scorer.score(primary, e));
        // Use features from first comparison
        const features = scores[0]?.features;
        if (!features) {
            throw new Error('Could not extract features for merge');
        }
        // Store merge
        const record = this.storage.storeMerge(request, features, this.config.weights, this.config.threshold, this.config.method);
        return record;
    }
    /**
     * Revert a merge
     */
    revertMerge(mergeId, actor, reason) {
        this.storage.revertMerge(mergeId, actor, reason);
    }
    /**
     * Split an entity
     */
    split(request) {
        // Validate request
        if (request.splitGroups.length < 2) {
            throw new Error('At least 2 split groups required');
        }
        // Verify entity exists
        const entity = this.storage.getEntity(request.entityId);
        if (!entity) {
            throw new Error(`Entity ${request.entityId} not found`);
        }
        if (entity.tenantId !== request.tenantId) {
            throw new Error(`Entity ${request.entityId} does not belong to tenant ${request.tenantId}`);
        }
        // Create new entity IDs for each split
        const newEntityIds = request.splitGroups.map(() => (0, node_crypto_1.randomUUID)());
        // Create new entities
        request.splitGroups.forEach((group, index) => {
            const newEntity = {
                id: newEntityIds[index],
                type: entity.type,
                name: entity.name,
                tenantId: entity.tenantId,
                attributes: { ...entity.attributes, ...group.attributes },
                deviceIds: group.deviceIds,
                accountIds: group.accountIds,
            };
            this.storage.storeEntity(newEntity);
        });
        // Store split record
        const record = this.storage.storeSplit(request, newEntityIds);
        return record;
    }
    /**
     * Explain a merge decision
     */
    explain(mergeId) {
        const explanation = this.storage.getExplanation(mergeId);
        if (!explanation) {
            throw new Error(`Explanation for merge ${mergeId} not found`);
        }
        return explanation;
    }
    /**
     * Explain a comparison between two entities
     */
    explainPair(request) {
        const scoringConfig = {
            ...this.config,
            method: request.method || this.config.method,
            threshold: request.threshold || this.config.threshold,
        };
        const scorer = (0, scorer_js_1.createScorer)(scoringConfig);
        const result = scorer.score(request.entityA, request.entityB);
        const featureContributions = (0, scorer_js_1.buildFeatureContributions)(result.features, scoringConfig.weights);
        return {
            score: result.score,
            confidence: result.confidence,
            method: scorer.getMethod(),
            threshold: scoringConfig.threshold,
            features: result.features,
            rationale: result.rationale,
            featureWeights: scoringConfig.weights,
            featureContributions,
        };
    }
    /**
     * Export a merge bundle with explanation metadata
     */
    exportMergeBundle(mergeId) {
        const merge = this.getMerge(mergeId);
        if (!merge) {
            throw new Error(`Merge ${mergeId} not found`);
        }
        const explanation = this.explain(mergeId);
        return { merge, explanation };
    }
    /**
     * Get merge record
     */
    getMerge(mergeId) {
        return this.storage.getMerge(mergeId);
    }
    /**
     * Get split record
     */
    getSplit(splitId) {
        return this.storage.getSplit(splitId);
    }
    /**
     * Get audit log
     */
    getAuditLog(options) {
        return this.storage.getAuditLog(options);
    }
    /**
     * Store entity (for testing/demo)
     */
    storeEntity(entity) {
        this.storage.storeEntity(entity);
    }
    /**
     * Get entity
     */
    getEntity(id) {
        return this.storage.getEntity(id);
    }
    /**
     * Get all entities for a tenant
     */
    getEntitiesByTenant(tenantId) {
        return this.storage.getEntitiesByTenant(tenantId);
    }
    /**
     * Get statistics
     */
    getStats() {
        return this.storage.getStats();
    }
    /**
     * Clear all data (for testing)
     */
    clear() {
        this.storage.clear();
    }
}
exports.EREngine = EREngine;
