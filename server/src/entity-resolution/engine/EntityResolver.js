"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityResolver = void 0;
const IntelGraphService_js_1 = require("../../services/IntelGraphService.js");
const MLScorer_js_1 = require("./MLScorer.js");
const ConflictResolver_js_1 = require("./ConflictResolver.js");
const ledger_js_1 = require("../../provenance/ledger.js");
const NaiveBayesModel_js_1 = require("../models/NaiveBayesModel.js");
class EntityResolver {
    graphService;
    scorer;
    constructor(model) {
        this.graphService = IntelGraphService_js_1.IntelGraphService.getInstance();
        // Default to NaiveBayesModel for "Advanced" resolution, or fallback to default
        this.scorer = new MLScorer_js_1.MLScorer(model || new NaiveBayesModel_js_1.NaiveBayesModel());
    }
    /**
     * Finds potential duplicates for a given entity.
     */
    async findDuplicates(tenantId, entityId, threshold = 0.7) {
        // 1. Fetch target entity
        const entity = await this.graphService.getNodeById(tenantId, entityId);
        if (!entity) {
            throw new Error(`Entity not found: ${entityId}`);
        }
        // 2. Fetch candidates using Blocking Strategy
        // In production, use search index or blocking keys.
        // We use the new findSimilarNodes for fuzzy blocking.
        const label = entity.label || 'Person';
        let candidates = [];
        try {
            const e = entity;
            // Use the new fuzzy search capability
            candidates = await this.graphService.findSimilarNodes(tenantId, label, {
                name: e.name,
                email: e.email,
                phone: e.phone
            }, 100);
            // Fallback: if no candidates found via fuzzy search, maybe fetch some recent ones?
            // But findSimilarNodes should cover exact matches too.
        }
        catch (e) {
            // If labels are invalid, ignore.
            console.warn('Error fetching candidates', e);
        }
        // Filter out self
        candidates = candidates.filter(c => c.id !== entityId);
        // 3. Score candidates
        const results = [];
        for (const candidate of candidates) {
            const prediction = await this.scorer.score(entity, candidate);
            if (prediction.score >= threshold) {
                results.push({
                    matchCandidateId: candidate.id,
                    score: prediction.score,
                    confidence: prediction.confidence,
                    explanation: prediction.explanation,
                    suggestedAction: prediction.suggestedAction
                });
            }
        }
        return results.sort((a, b) => b.score - a.score);
    }
    /**
     * Recommends whether to merge two entities.
     */
    async recommendMerge(tenantId, entityIdA, entityIdB) {
        const entityA = await this.graphService.getNodeById(tenantId, entityIdA);
        const entityB = await this.graphService.getNodeById(tenantId, entityIdB);
        if (!entityA || !entityB) {
            throw new Error('One or both entities not found');
        }
        return this.scorer.score(entityA, entityB);
    }
    /**
     * Executes a merge of two entities.
     */
    async merge(tenantId, entityIdA, // Primary (surviving)
    entityIdB, // Secondary (merging into A)
    strategies = ['recency'], dryRun = false) {
        const entityA = await this.graphService.getNodeById(tenantId, entityIdA);
        const entityB = await this.graphService.getNodeById(tenantId, entityIdB);
        if (!entityA || !entityB) {
            throw new Error('One or both entities not found');
        }
        // Resolve conflict
        const mergedEntity = ConflictResolver_js_1.ConflictResolver.resolve(entityA, entityB, strategies);
        // Create merge preview / result
        const result = {
            originalA: entityA,
            originalB: entityB,
            merged: mergedEntity,
            strategies
        };
        if (dryRun) {
            return { ...result, status: 'dry-run' };
        }
        // Execute Merge
        const label = entityA.labels ? entityA.labels[0] : (entityA.label || 'Person');
        // Remove system fields from merged object before update
        const { id, tenantId: tid, createdAt, updatedAt, ...propsToUpdate } = mergedEntity;
        await this.graphService.ensureNode(tenantId, label, propsToUpdate);
        // 2. Create relationship MERGED_INTO from B to A
        await this.graphService.createEdge(tenantId, entityIdB, entityIdA, 'MERGED_INTO', {
            timestamp: new Date().toISOString(),
            reason: 'Entity Resolution Merge'
        });
        // 3. Record Provenance
        await ledger_js_1.provenanceLedger.appendEntry({
            timestamp: new Date(),
            tenantId,
            actionType: 'MERGE_ENTITIES',
            resourceType: 'Entity',
            resourceId: entityIdA,
            actorId: 'system-entity-resolver', // Or get from context
            actorType: 'system',
            payload: {
                mutationType: 'MERGE',
                entityId: entityIdA,
                entityType: label,
                newState: {
                    id: entityIdA,
                    type: label,
                    version: 1,
                    data: mergedEntity,
                    metadata: { mergedFrom: entityIdB, strategies }
                },
                reason: `Merged with ${entityIdB} using ${strategies.join(', ')}`
            },
            metadata: {
                purpose: 'Entity Resolution',
            }
        });
        return { ...result, status: 'completed' };
    }
}
exports.EntityResolver = EntityResolver;
