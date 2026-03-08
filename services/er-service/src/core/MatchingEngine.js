"use strict";
/**
 * Matching Engine
 *
 * Orchestrates all matchers (deterministic and probabilistic) to produce
 * match decisions based on configurable thresholds.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchingEngine = void 0;
exports.createMatchingEngine = createMatchingEngine;
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
const index_js_1 = require("../matchers/index.js");
const logger = (0, pino_1.default)({ name: 'MatchingEngine' });
const DEFAULT_THRESHOLDS = {
    Person: {
        entityType: 'Person',
        autoMergeThreshold: 0.90,
        candidateThreshold: 0.60,
        autoNoMatchThreshold: 0.30,
        featureWeights: {
            NATIONAL_ID: 1.0,
            SSN: 1.0,
            PASSPORT_NUMBER: 1.0,
            EMAIL: 0.95,
            PHONE: 0.90,
            FULL_NAME: 0.80,
            FIRST_NAME: 0.40,
            LAST_NAME: 0.50,
            DATE_OF_BIRTH: 0.90,
            ADDRESS: 0.60,
            GENDER: 0.30,
            NATIONALITY: 0.40,
        },
        deterministicFeatures: ['NATIONAL_ID', 'SSN', 'PASSPORT_NUMBER'],
        requiredFeatures: [],
        version: '1.0.0',
        effectiveFrom: new Date().toISOString(),
    },
    Organization: {
        entityType: 'Organization',
        autoMergeThreshold: 0.92,
        candidateThreshold: 0.65,
        autoNoMatchThreshold: 0.35,
        featureWeights: {
            TAX_ID: 1.0,
            LEI: 1.0,
            DUNS: 1.0,
            REGISTRATION_NUMBER: 1.0,
            EMAIL: 0.85,
            NAME: 0.80,
            ADDRESS: 0.65,
        },
        deterministicFeatures: ['TAX_ID', 'LEI', 'DUNS', 'REGISTRATION_NUMBER'],
        requiredFeatures: [],
        version: '1.0.0',
        effectiveFrom: new Date().toISOString(),
    },
    Device: {
        entityType: 'Device',
        autoMergeThreshold: 0.95,
        candidateThreshold: 0.70,
        autoNoMatchThreshold: 0.40,
        featureWeights: {
            DEVICE_ID: 1.0,
            IP_ADDRESS: 0.70,
            NAME: 0.50,
        },
        deterministicFeatures: ['DEVICE_ID'],
        requiredFeatures: [],
        version: '1.0.0',
        effectiveFrom: new Date().toISOString(),
    },
    Account: {
        entityType: 'Account',
        autoMergeThreshold: 0.93,
        candidateThreshold: 0.65,
        autoNoMatchThreshold: 0.35,
        featureWeights: {
            ACCOUNT_NUMBER: 1.0,
            EMAIL: 0.95,
            PHONE: 0.85,
            DEVICE_ID: 0.90,
        },
        deterministicFeatures: ['ACCOUNT_NUMBER'],
        requiredFeatures: [],
        version: '1.0.0',
        effectiveFrom: new Date().toISOString(),
    },
    Asset: {
        entityType: 'Asset',
        autoMergeThreshold: 0.95,
        candidateThreshold: 0.70,
        autoNoMatchThreshold: 0.40,
        featureWeights: {
            ACCOUNT_NUMBER: 1.0,
            DEVICE_ID: 0.95,
            NAME: 0.60,
        },
        deterministicFeatures: ['ACCOUNT_NUMBER'],
        requiredFeatures: [],
        version: '1.0.0',
        effectiveFrom: new Date().toISOString(),
    },
    Location: {
        entityType: 'Location',
        autoMergeThreshold: 0.90,
        candidateThreshold: 0.65,
        autoNoMatchThreshold: 0.35,
        featureWeights: {
            ADDRESS: 0.90,
            NAME: 0.70,
            CITY: 0.60,
            COUNTRY: 0.50,
        },
        deterministicFeatures: [],
        requiredFeatures: [],
        version: '1.0.0',
        effectiveFrom: new Date().toISOString(),
    },
    Document: {
        entityType: 'Document',
        autoMergeThreshold: 0.95,
        candidateThreshold: 0.70,
        autoNoMatchThreshold: 0.40,
        featureWeights: {
            NAME: 0.60,
        },
        deterministicFeatures: [],
        requiredFeatures: [],
        version: '1.0.0',
        effectiveFrom: new Date().toISOString(),
    },
    Event: {
        entityType: 'Event',
        autoMergeThreshold: 0.90,
        candidateThreshold: 0.65,
        autoNoMatchThreshold: 0.35,
        featureWeights: {
            NAME: 0.70,
        },
        deterministicFeatures: [],
        requiredFeatures: [],
        version: '1.0.0',
        effectiveFrom: new Date().toISOString(),
    },
};
class MatchingEngine {
    config;
    deterministicMatchers;
    probabilisticMatchers;
    thresholds;
    constructor(config) {
        this.config = {
            version: '1.0.0',
            defaultThresholds: DEFAULT_THRESHOLDS,
            enableDeterministicShortCircuit: true,
            maxCandidates: 100,
            parallelMatching: true,
            ...config,
        };
        this.deterministicMatchers = (0, index_js_1.createDeterministicMatchers)();
        this.probabilisticMatchers = (0, index_js_1.createProbabilisticMatchers)();
        this.thresholds = new Map(Object.entries(this.config.defaultThresholds));
        logger.info({
            version: this.config.version,
            deterministicMatchers: this.deterministicMatchers.length,
            probabilisticMatchers: this.probabilisticMatchers.length,
        }, 'MatchingEngine initialized');
    }
    get version() {
        return this.config.version;
    }
    /**
     * Compare two identity nodes and produce a match result
     */
    async compare(nodeA, nodeB) {
        const startTime = Date.now();
        if (nodeA.entityType !== nodeB.entityType) {
            return {
                nodeAId: nodeA.nodeId,
                nodeBId: nodeB.nodeId,
                overallScore: 0,
                confidence: 1.0,
                decision: 'AUTO_NO_MATCH',
                decisionReason: 'Entity types do not match',
                features: [],
                deterministicMatch: false,
                processingTimeMs: Date.now() - startTime,
            };
        }
        const entityType = nodeA.entityType;
        const thresholds = this.getThresholds(entityType);
        const input = {
            entityType,
            attributesA: nodeA.attributes,
            attributesB: nodeB.attributes,
            normalizedA: nodeA.normalizedAttributes,
            normalizedB: nodeB.normalizedAttributes,
        };
        // Run deterministic matchers first
        const deterministicResults = await this.runDeterministicMatchers(input);
        // Check for deterministic short-circuit
        if (this.config.enableDeterministicShortCircuit) {
            const deterministicMatch = deterministicResults.find((r) => r.similarity >= 1.0 && thresholds.deterministicFeatures.includes(r.featureType));
            if (deterministicMatch) {
                logger.debug({ nodeAId: nodeA.nodeId, nodeBId: nodeB.nodeId, feature: deterministicMatch.featureType }, 'Deterministic match found, short-circuiting');
                return {
                    nodeAId: nodeA.nodeId,
                    nodeBId: nodeB.nodeId,
                    overallScore: 1.0,
                    confidence: 1.0,
                    decision: 'AUTO_MERGE',
                    decisionReason: `Deterministic match on ${deterministicMatch.featureType}`,
                    features: this.toFeatureEvidence(deterministicResults),
                    deterministicMatch: true,
                    processingTimeMs: Date.now() - startTime,
                };
            }
            // Check for deterministic mismatch on same identifier type
            const deterministicMismatch = deterministicResults.find((r) => r.similarity === 0 && thresholds.deterministicFeatures.includes(r.featureType));
            if (deterministicMismatch) {
                return {
                    nodeAId: nodeA.nodeId,
                    nodeBId: nodeB.nodeId,
                    overallScore: 0,
                    confidence: 1.0,
                    decision: 'AUTO_NO_MATCH',
                    decisionReason: `Deterministic mismatch on ${deterministicMismatch.featureType}`,
                    features: this.toFeatureEvidence(deterministicResults),
                    deterministicMatch: false,
                    processingTimeMs: Date.now() - startTime,
                };
            }
        }
        // Run probabilistic matchers
        const probabilisticResults = await this.runProbabilisticMatchers(input);
        // Combine all results
        const allResults = [...deterministicResults, ...probabilisticResults];
        const features = this.toFeatureEvidence(allResults);
        // Calculate overall score
        const { score, confidence } = this.calculateOverallScore(features, thresholds);
        // Make decision
        const { decision, reason } = this.makeDecision(score, thresholds, features);
        const result = {
            nodeAId: nodeA.nodeId,
            nodeBId: nodeB.nodeId,
            overallScore: score,
            confidence,
            decision,
            decisionReason: reason,
            features,
            deterministicMatch: false,
            processingTimeMs: Date.now() - startTime,
        };
        logger.debug({
            nodeAId: nodeA.nodeId,
            nodeBId: nodeB.nodeId,
            score,
            decision,
            processingTimeMs: result.processingTimeMs,
        }, 'Match comparison completed');
        return result;
    }
    /**
     * Find matching candidates for a given node from a pool of nodes
     */
    async findCandidates(targetNode, candidatePool, thresholdOverride) {
        const thresholds = this.getThresholds(targetNode.entityType);
        const minThreshold = thresholdOverride ?? thresholds.autoNoMatchThreshold;
        const candidates = [];
        // Filter candidates by entity type first
        const eligibleCandidates = candidatePool.filter((node) => node.entityType === targetNode.entityType && node.nodeId !== targetNode.nodeId);
        // Run comparisons
        const comparisons = await Promise.all(eligibleCandidates.map((candidate) => this.compare(targetNode, candidate)));
        for (let i = 0; i < comparisons.length; i++) {
            const result = comparisons[i];
            const candidate = eligibleCandidates[i];
            if (result.overallScore >= minThreshold) {
                candidates.push({
                    nodeId: candidate.nodeId,
                    clusterId: candidate.clusterId,
                    score: result.overallScore,
                    confidence: result.confidence,
                    decision: result.decision,
                    features: result.features,
                });
            }
        }
        // Sort by score descending and limit
        return candidates
            .sort((a, b) => b.score - a.score)
            .slice(0, this.config.maxCandidates);
    }
    /**
     * Create a MatchEdge from a comparison result
     */
    createMatchEdge(result) {
        return {
            edgeId: (0, uuid_1.v4)(),
            nodeAId: result.nodeAId,
            nodeBId: result.nodeBId,
            overallScore: result.overallScore,
            confidence: result.confidence,
            features: result.features,
            decision: result.decision,
            decisionReason: result.decisionReason,
            matcherVersion: this.config.version,
            createdAt: new Date().toISOString(),
        };
    }
    /**
     * Update thresholds for an entity type
     */
    updateThresholds(entityType, thresholds) {
        const current = this.getThresholds(entityType);
        this.thresholds.set(entityType, { ...current, ...thresholds, entityType });
        logger.info({ entityType, thresholds }, 'Thresholds updated');
    }
    /**
     * Get current thresholds for an entity type
     */
    getThresholds(entityType) {
        return this.thresholds.get(entityType) ?? DEFAULT_THRESHOLDS[entityType];
    }
    async runDeterministicMatchers(input) {
        const applicableMatchers = this.deterministicMatchers.filter((m) => m.supportsEntityType(input.entityType));
        if (this.config.parallelMatching) {
            const results = await Promise.all(applicableMatchers.map((m) => m.match(input)));
            return results.flat();
        }
        const results = [];
        for (const matcher of applicableMatchers) {
            const matchResults = await matcher.match(input);
            results.push(...matchResults);
        }
        return results;
    }
    async runProbabilisticMatchers(input) {
        const applicableMatchers = this.probabilisticMatchers.filter((m) => m.supportsEntityType(input.entityType));
        if (this.config.parallelMatching) {
            const results = await Promise.all(applicableMatchers.map((m) => m.match(input)));
            return results.flat();
        }
        const results = [];
        for (const matcher of applicableMatchers) {
            const matchResults = await matcher.match(input);
            results.push(...matchResults);
        }
        return results;
    }
    toFeatureEvidence(results) {
        return results.map((r) => ({
            featureType: r.featureType,
            valueA: r.valueA,
            valueB: r.valueB,
            similarity: r.similarity,
            weight: r.weight,
            matcherUsed: 'MatchingEngine',
            isDeterministic: r.isDeterministic,
            explanation: r.explanation,
            metadata: r.metadata,
        }));
    }
    calculateOverallScore(features, thresholds) {
        if (features.length === 0) {
            return { score: 0, confidence: 0 };
        }
        let weightedSum = 0;
        let totalWeight = 0;
        let deterministicBonus = 0;
        for (const feature of features) {
            const featureWeight = thresholds.featureWeights[feature.featureType] ?? feature.weight;
            const contribution = feature.similarity * featureWeight;
            weightedSum += contribution;
            totalWeight += featureWeight;
            // Deterministic features get extra weight when they match
            if (feature.isDeterministic && feature.similarity >= 1.0) {
                deterministicBonus += 0.1;
            }
        }
        const baseScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
        const score = Math.min(1.0, baseScore + deterministicBonus);
        // Confidence is based on feature coverage
        const expectedFeatures = Object.keys(thresholds.featureWeights).length;
        const coverage = Math.min(1.0, features.length / Math.max(1, expectedFeatures));
        const avgSimilarity = features.reduce((sum, f) => sum + f.similarity, 0) / features.length;
        const confidence = coverage * 0.5 + avgSimilarity * 0.5;
        return { score, confidence };
    }
    makeDecision(score, thresholds, features) {
        // Check for auto-merge
        if (score >= thresholds.autoMergeThreshold) {
            const topFeatures = features
                .filter((f) => f.similarity >= 0.8)
                .map((f) => f.featureType)
                .slice(0, 3);
            return {
                decision: 'AUTO_MERGE',
                reason: `Score ${(score * 100).toFixed(1)}% exceeds auto-merge threshold. Strong matches on: ${topFeatures.join(', ')}`,
            };
        }
        // Check for auto-no-match
        if (score <= thresholds.autoNoMatchThreshold) {
            const weakFeatures = features
                .filter((f) => f.similarity < 0.5)
                .map((f) => f.featureType)
                .slice(0, 3);
            return {
                decision: 'AUTO_NO_MATCH',
                reason: `Score ${(score * 100).toFixed(1)}% below auto-no-match threshold. Weak matches on: ${weakFeatures.join(', ')}`,
            };
        }
        // Candidate zone - requires manual review
        return {
            decision: 'CANDIDATE',
            reason: `Score ${(score * 100).toFixed(1)}% in candidate zone (${(thresholds.autoNoMatchThreshold * 100).toFixed(0)}%-${(thresholds.autoMergeThreshold * 100).toFixed(0)}%). Manual review required.`,
        };
    }
}
exports.MatchingEngine = MatchingEngine;
/**
 * Create a new matching engine with default configuration
 */
function createMatchingEngine(config) {
    return new MatchingEngine(config);
}
