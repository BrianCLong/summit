"use strict";
/**
 * ER Decision Service
 * Threshold-based routing for entity resolution decisions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERDecisionService = void 0;
const canonical_schema_1 = require("@intelgraph/canonical-schema");
const uuid_1 = require("uuid");
class ERDecisionService {
    /**
     * Route a match score to a decision based on thresholds
     */
    async routeDecision(matchScore, thresholds, entityType) {
        const { overallScore } = matchScore;
        let decision;
        let reviewRequired;
        let decisionMethod;
        // Apply threshold rules
        if (overallScore >= thresholds.autoMergeThreshold) {
            // High confidence: auto-merge
            decision = 'MERGE';
            reviewRequired = false;
            decisionMethod = 'auto';
        }
        else if (overallScore >= thresholds.manualReviewThreshold) {
            // Medium confidence: manual review
            decision = 'DEFER';
            reviewRequired = true;
            decisionMethod = 'manual';
        }
        else {
            // Low confidence: reject
            decision = 'NO_MERGE';
            reviewRequired = false;
            decisionMethod = 'auto';
        }
        return {
            id: (0, uuid_1.v4)(),
            matchScore,
            decision,
            decisionMethod,
            decidedAt: new Date(),
            reviewRequired,
            entityType,
            audit: {
                traceId: (0, uuid_1.v4)(),
            },
        };
    }
    /**
     * Get default thresholds for an entity type
     */
    getDefaultThresholds(entityType) {
        const thresholdMap = {
            [canonical_schema_1.CanonicalEntityType.PERSON]: {
                autoMergeThreshold: 0.90,
                manualReviewThreshold: 0.70,
                rejectThreshold: 0.70,
                targetPrecision: 0.90,
            },
            [canonical_schema_1.CanonicalEntityType.ORGANIZATION]: {
                autoMergeThreshold: 0.88,
                manualReviewThreshold: 0.70,
                rejectThreshold: 0.70,
                targetPrecision: 0.88,
            },
            [canonical_schema_1.CanonicalEntityType.LOCATION]: {
                autoMergeThreshold: 0.85,
                manualReviewThreshold: 0.65,
                rejectThreshold: 0.65,
                targetPrecision: 0.85,
            },
            [canonical_schema_1.CanonicalEntityType.ASSET]: {
                autoMergeThreshold: 0.82,
                manualReviewThreshold: 0.65,
                rejectThreshold: 0.65,
                targetPrecision: 0.82,
            },
        };
        const defaults = thresholdMap[entityType] || {
            autoMergeThreshold: 0.85,
            manualReviewThreshold: 0.70,
            rejectThreshold: 0.70,
            targetPrecision: 0.85,
        };
        return {
            entityType,
            autoMergeThreshold: defaults.autoMergeThreshold,
            manualReviewThreshold: defaults.manualReviewThreshold,
            rejectThreshold: defaults.rejectThreshold,
            targetPrecision: defaults.targetPrecision,
            currentPrecision: 0,
            sampleSize: 0,
            lastCalibrated: new Date(),
        };
    }
    /**
     * Update thresholds based on precision metrics
     */
    async calibrateThresholds(entityType, decisions) {
        // Count merge decisions with high confidence
        const mergeDecisions = decisions.filter(d => d.decision === 'MERGE');
        const highConfidenceMerges = mergeDecisions.filter(d => d.matchScore.confidence >= 0.8);
        const currentPrecision = mergeDecisions.length > 0
            ? highConfidenceMerges.length / mergeDecisions.length
            : 0;
        const thresholds = this.getDefaultThresholds(entityType);
        thresholds.currentPrecision = currentPrecision;
        thresholds.sampleSize = decisions.length;
        thresholds.lastCalibrated = new Date();
        // Adjust thresholds if precision is below target
        if (currentPrecision < thresholds.targetPrecision && mergeDecisions.length >= 100) {
            // Increase threshold to improve precision
            thresholds.autoMergeThreshold = Math.min(0.95, thresholds.autoMergeThreshold + 0.02);
            console.log(`Calibrated ${entityType} threshold to ${thresholds.autoMergeThreshold.toFixed(3)} ` +
                `(precision: ${currentPrecision.toFixed(3)} < target: ${thresholds.targetPrecision})`);
        }
        return thresholds;
    }
}
exports.ERDecisionService = ERDecisionService;
