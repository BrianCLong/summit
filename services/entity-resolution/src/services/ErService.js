"use strict";
/**
 * Entity Resolution Service - Main Service Class
 *
 * Orchestrates entity resolution with explainability and human-in-the-loop
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErService = void 0;
const classifier_js_1 = require("../matching/classifier.js");
const blocking_js_1 = require("../matching/blocking.js");
const crypto_1 = require("crypto");
/**
 * Main ER Service
 */
class ErService {
    entityRepo;
    decisionRepo;
    mergeRepo;
    config;
    constructor(entityRepo, decisionRepo, mergeRepo, config) {
        this.entityRepo = entityRepo;
        this.decisionRepo = decisionRepo;
        this.mergeRepo = mergeRepo;
        this.config = config;
    }
    /**
     * Compare two entity records on demand
     * Returns a MatchDecision with full explainability
     */
    async compare(recordA, recordB, decidedBy = 'er-engine') {
        const decision = (0, classifier_js_1.decideMatch)(recordA, recordB, this.config, decidedBy);
        // Save decision to repository
        await this.decisionRepo.save(decision);
        return decision;
    }
    /**
     * Find candidate matches for a batch of records
     * Uses blocking to reduce O(N²) comparisons
     */
    async batchCandidates(records, maxCandidatesPerRecord = 10) {
        // Find candidate pairs using blocking
        const candidatePairs = (0, blocking_js_1.findCandidatePairs)(records);
        // Create a map for quick record lookup
        const recordMap = new Map();
        for (const record of records) {
            recordMap.set(record.id, record);
        }
        // Score each pair
        const decisions = [];
        for (const [idA, idB] of candidatePairs) {
            const recordA = recordMap.get(idA);
            const recordB = recordMap.get(idB);
            if (!recordA || !recordB)
                continue;
            const decision = (0, classifier_js_1.decideMatch)(recordA, recordB, this.config);
            await this.decisionRepo.save(decision);
            decisions.push(decision);
        }
        // Sort by score descending
        decisions.sort((a, b) => b.matchScore - a.matchScore);
        return { decisions };
    }
    /**
     * Apply a merge: combine secondary into primary
     * Stores pre-merge snapshots for reversibility
     */
    async merge(primaryId, secondaryId, triggeredBy, reason, decisionId) {
        // Fetch both records
        const primary = await this.entityRepo.findById(primaryId);
        const secondary = await this.entityRepo.findById(secondaryId);
        if (!primary) {
            throw new Error(`Primary record not found: ${primaryId}`);
        }
        if (!secondary) {
            throw new Error(`Secondary record not found: ${secondaryId}`);
        }
        // Fetch decision context if provided
        let decisionContext;
        if (decisionId) {
            decisionContext = (await this.decisionRepo.findById(decisionId)) || undefined;
        }
        // Create merge operation with pre-merge snapshot
        const mergeOperation = {
            mergeId: (0, crypto_1.randomUUID)(),
            primaryId,
            secondaryId,
            outcome: 'APPLIED',
            triggeredBy,
            triggeredAt: new Date().toISOString(),
            reason,
            decisionContext,
            preMergeSnapshot: {
                primaryRecord: JSON.parse(JSON.stringify(primary)),
                secondaryRecord: JSON.parse(JSON.stringify(secondary)),
            },
        };
        // Save merge operation
        await this.mergeRepo.save(mergeOperation);
        // Perform merge: Merge attributes from secondary into primary
        const mergedAttributes = this.mergeAttributes(primary.attributes, secondary.attributes);
        const mergedEntity = {
            ...primary,
            attributes: mergedAttributes,
            updatedAt: new Date().toISOString(),
        };
        // Mark secondary as merged (soft delete)
        const mergedSecondary = {
            ...secondary,
            attributes: {
                ...secondary.attributes,
                _merged: true,
                _mergedInto: primaryId,
                _mergeOperationId: mergeOperation.mergeId,
            },
            updatedAt: new Date().toISOString(),
        };
        // Update repositories
        await this.entityRepo.save(mergedEntity);
        await this.entityRepo.save(mergedSecondary);
        return {
            id: mergedEntity.id,
            entityType: mergedEntity.entityType,
            attributes: mergedEntity.attributes,
            mergedFrom: [primaryId, secondaryId],
            mergeOperationId: mergeOperation.mergeId,
        };
    }
    /**
     * Split (undo) a merge operation
     * Restores records to their pre-merge state
     */
    async split(mergeId, reason, triggeredBy) {
        // Fetch merge operation
        const mergeOp = await this.mergeRepo.findById(mergeId);
        if (!mergeOp) {
            throw new Error(`Merge operation not found: ${mergeId}`);
        }
        if (mergeOp.outcome !== 'APPLIED') {
            throw new Error(`Merge operation is not in APPLIED state: ${mergeOp.outcome}`);
        }
        if (!mergeOp.preMergeSnapshot) {
            throw new Error(`No pre-merge snapshot available for merge: ${mergeId}`);
        }
        // Restore original records from snapshot
        const { primaryRecord, secondaryRecord } = mergeOp.preMergeSnapshot;
        await this.entityRepo.save(primaryRecord);
        await this.entityRepo.save(secondaryRecord);
        // Update merge operation status
        const updatedMergeOp = {
            ...mergeOp,
            outcome: 'REJECTED',
        };
        await this.mergeRepo.save(updatedMergeOp);
    }
    /**
     * Get match decision by ID
     */
    async getDecision(id) {
        return this.decisionRepo.findById(id);
    }
    /**
     * Get merge history for a record
     */
    async getMergeHistory(recordId) {
        return this.mergeRepo.findByRecordId(recordId);
    }
    /**
     * Merge attributes strategy: prefer non-null values from primary,
     * fill in missing values from secondary
     */
    mergeAttributes(primary, secondary) {
        const merged = { ...primary };
        for (const key of Object.keys(secondary)) {
            // Skip internal merge markers
            if (key.startsWith('_merge'))
                continue;
            // If primary doesn't have this key, add it
            if (!(key in merged) || merged[key] === null || merged[key] === undefined) {
                merged[key] = secondary[key];
            }
        }
        return merged;
    }
}
exports.ErService = ErService;
