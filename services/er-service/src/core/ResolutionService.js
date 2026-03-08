"use strict";
/**
 * Resolution Service
 *
 * Main orchestration service for entity resolution.
 * Coordinates matching, clustering, review queue, and event publishing.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolutionService = exports.ResolutionService = void 0;
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
const MatchingEngine_js_1 = require("./MatchingEngine.js");
const IdentityNodeRepository_js_1 = require("../db/IdentityNodeRepository.js");
const IdentityClusterRepository_js_1 = require("../db/IdentityClusterRepository.js");
const ReviewQueueRepository_js_1 = require("../db/ReviewQueueRepository.js");
const EventBus_js_1 = require("../events/EventBus.js");
const ExplainabilityService_js_1 = require("../explainability/ExplainabilityService.js");
const logger = (0, pino_1.default)({ name: 'ResolutionService' });
const DEFAULT_CONFIG = {
    maxCandidatesPerResolution: 50,
    autoCreateCluster: true,
    publishEvents: true,
};
class ResolutionService {
    config;
    matchingEngine;
    constructor(config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.matchingEngine = config?.matchingEngine ?? (0, MatchingEngine_js_1.createMatchingEngine)();
        logger.info({ config: this.config }, 'ResolutionService initialized');
    }
    /**
     * Resolve a record immediately (online API)
     */
    async resolveNow(request) {
        const startTime = Date.now();
        const requestId = (0, uuid_1.v4)();
        const correlationId = (0, uuid_1.v4)();
        logger.info({ requestId, tenantId: request.tenantId, entityType: request.entityType }, 'Starting resolution');
        try {
            // Create or get the identity node for this record
            const node = await this.createOrGetNode(request);
            // If node already has a cluster, return it
            if (node.clusterId) {
                const cluster = await IdentityClusterRepository_js_1.identityClusterRepository.getById(node.clusterId);
                if (cluster) {
                    return this.buildResponse(requestId, request, node, cluster.clusterId, false, [], Date.now() - startTime);
                }
            }
            // Find candidate matches
            const candidatePool = await IdentityNodeRepository_js_1.identityNodeRepository.search({
                tenantId: request.tenantId,
                entityType: request.entityType,
                limit: this.config.maxCandidatesPerResolution,
            });
            const candidates = await this.matchingEngine.findCandidates(node, candidatePool, request.options?.thresholdOverride);
            // Process candidates
            const result = await this.processResolutionCandidates(request.tenantId, node, candidates, correlationId);
            return this.buildResponse(requestId, request, node, result.clusterId, result.isNewCluster, candidates, Date.now() - startTime);
        }
        catch (error) {
            logger.error({ error, requestId }, 'Resolution failed');
            throw error;
        }
    }
    /**
     * Manually merge two nodes
     */
    async manualMerge(tenantId, nodeAId, nodeBId, decidedBy, notes) {
        const [nodeA, nodeB] = await Promise.all([
            IdentityNodeRepository_js_1.identityNodeRepository.getById(nodeAId),
            IdentityNodeRepository_js_1.identityNodeRepository.getById(nodeBId),
        ]);
        if (!nodeA || !nodeB) {
            throw new Error('One or both nodes not found');
        }
        // If both are in clusters, merge the clusters
        if (nodeA.clusterId && nodeB.clusterId) {
            if (nodeA.clusterId === nodeB.clusterId) {
                const cluster = await IdentityClusterRepository_js_1.identityClusterRepository.getById(nodeA.clusterId);
                if (!cluster)
                    throw new Error('Cluster not found');
                return cluster;
            }
            return IdentityClusterRepository_js_1.identityClusterRepository.merge(nodeA.clusterId, nodeB.clusterId, decidedBy, notes ?? 'Manual merge');
        }
        // If one has a cluster, add the other to it
        if (nodeA.clusterId) {
            return this.addNodeToCluster(nodeB, nodeA.clusterId, decidedBy);
        }
        if (nodeB.clusterId) {
            return this.addNodeToCluster(nodeA, nodeB.clusterId, decidedBy);
        }
        // Neither has a cluster - create new
        return this.createClusterFromNodes(tenantId, [nodeA, nodeB], decidedBy);
    }
    /**
     * Get cluster for a node
     */
    async getClusterForNode(nodeId) {
        const node = await IdentityNodeRepository_js_1.identityNodeRepository.getById(nodeId);
        if (!node?.clusterId)
            return null;
        return IdentityClusterRepository_js_1.identityClusterRepository.getById(node.clusterId);
    }
    /**
     * Explain why two nodes are matched/linked
     */
    async explainMatch(nodeAId, nodeBId) {
        const [nodeA, nodeB] = await Promise.all([
            IdentityNodeRepository_js_1.identityNodeRepository.getById(nodeAId),
            IdentityNodeRepository_js_1.identityNodeRepository.getById(nodeBId),
        ]);
        if (!nodeA || !nodeB) {
            throw new Error('One or both nodes not found');
        }
        // Run comparison
        const matchResult = await this.matchingEngine.compare(nodeA, nodeB);
        const explanation = ExplainabilityService_js_1.explainabilityService.explainMatch({
            nodeA,
            nodeB,
            features: matchResult.features,
            score: matchResult.overallScore,
            decision: matchResult.decision,
            matcherVersion: this.matchingEngine.version,
        });
        // Check if they're in the same cluster
        let cluster = null;
        let path = [];
        if (nodeA.clusterId && nodeA.clusterId === nodeB.clusterId) {
            cluster = await IdentityClusterRepository_js_1.identityClusterRepository.getById(nodeA.clusterId);
            if (cluster) {
                // Find edge between these nodes
                const directEdge = cluster.edges.find((e) => (e.nodeAId === nodeAId && e.nodeBId === nodeBId) ||
                    (e.nodeAId === nodeBId && e.nodeBId === nodeAId));
                if (directEdge) {
                    path = [directEdge];
                }
            }
        }
        return { explanation, cluster, path };
    }
    /**
     * Process a review decision
     */
    async processReviewDecision(reviewId, decision, decidedBy, notes) {
        const review = await ReviewQueueRepository_js_1.reviewQueueRepository.getById(reviewId);
        if (!review) {
            throw new Error('Review item not found');
        }
        // Record the decision
        await ReviewQueueRepository_js_1.reviewQueueRepository.decide(reviewId, decision, decidedBy, notes);
        // Process the decision
        if (decision === 'MANUAL_MERGE') {
            await this.manualMerge(review.tenantId, review.nodeAId, review.nodeBId, decidedBy, notes);
        }
        // Publish event
        if (this.config.publishEvents) {
            const eventBus = (0, EventBus_js_1.getEventBus)();
            await eventBus.emitMatchDecision(review.tenantId, review.entityType, review.nodeAId, review.nodeBId, decision, review.matchScore);
        }
        logger.info({ reviewId, decision, decidedBy }, 'Review decision processed');
    }
    async createOrGetNode(request) {
        // If a record reference is provided, check if node already exists
        if (request.recordRef) {
            const existing = await IdentityNodeRepository_js_1.identityNodeRepository.search({
                tenantId: request.tenantId,
                entityType: request.entityType,
                sourceSystem: request.recordRef.sourceSystem,
                limit: 1,
            });
            // Check if this exact record exists
            const match = existing.find((n) => n.sourceRef.recordId === request.recordRef?.recordId);
            if (match)
                return match;
        }
        // Create new node
        const nodeInput = {
            tenantId: request.tenantId,
            entityType: request.entityType,
            sourceRef: request.recordRef ?? {
                sourceId: 'api',
                sourceSystem: 'er-service',
                recordId: (0, uuid_1.v4)(),
                recordType: request.entityType,
                ingestedAt: new Date().toISOString(),
                confidence: 0.9,
            },
            attributes: request.attributes,
        };
        return IdentityNodeRepository_js_1.identityNodeRepository.create(nodeInput);
    }
    async processResolutionCandidates(tenantId, node, candidates, correlationId) {
        // Find auto-merge candidates
        const autoMerge = candidates.find((c) => c.decision === 'AUTO_MERGE');
        if (autoMerge) {
            // Add to existing cluster
            if (autoMerge.clusterId) {
                await this.addNodeToClusterById(node, autoMerge.clusterId, 'auto-merge');
                if (this.config.publishEvents) {
                    const eventBus = (0, EventBus_js_1.getEventBus)();
                    await eventBus.emitNodeAdded(tenantId, node.entityType, autoMerge.clusterId, node.nodeId, correlationId);
                }
                return { clusterId: autoMerge.clusterId, isNewCluster: false };
            }
            // Create new cluster with both nodes
            const matchedNode = await IdentityNodeRepository_js_1.identityNodeRepository.getById(autoMerge.nodeId);
            if (matchedNode) {
                const cluster = await this.createClusterFromNodes(tenantId, [node, matchedNode], 'auto-merge');
                if (this.config.publishEvents) {
                    const eventBus = (0, EventBus_js_1.getEventBus)();
                    await eventBus.emitClusterCreated(tenantId, node.entityType, cluster.clusterId, cluster.nodeIds, correlationId);
                }
                return { clusterId: cluster.clusterId, isNewCluster: true };
            }
        }
        // Check for candidates needing review
        const reviewCandidates = candidates.filter((c) => c.decision === 'CANDIDATE');
        if (reviewCandidates.length > 0) {
            // Create review queue items for top candidates
            for (const candidate of reviewCandidates.slice(0, 3)) {
                const candidateNode = await IdentityNodeRepository_js_1.identityNodeRepository.getById(candidate.nodeId);
                if (!candidateNode)
                    continue;
                const exists = await ReviewQueueRepository_js_1.reviewQueueRepository.existsForPair(node.nodeId, candidate.nodeId);
                if (exists)
                    continue;
                const conflictingAttrs = candidate.features
                    .filter((f) => f.similarity < 0.5 && f.weight >= 0.3)
                    .map((f) => f.featureType);
                await ReviewQueueRepository_js_1.reviewQueueRepository.create({
                    tenantId,
                    entityType: node.entityType,
                    nodeAId: node.nodeId,
                    nodeBId: candidate.nodeId,
                    nodeASnapshot: node.attributes,
                    nodeBSnapshot: candidateNode.attributes,
                    matchScore: candidate.score,
                    features: candidate.features,
                    priority: this.calculateReviewPriority(candidate.score),
                    conflictingAttributes: conflictingAttrs,
                    sharedRelationships: 0,
                });
                if (this.config.publishEvents) {
                    const eventBus = (0, EventBus_js_1.getEventBus)();
                    await eventBus.emitReviewRequired(tenantId, node.entityType, (0, uuid_1.v4)(), node.nodeId, candidate.nodeId, candidate.score, correlationId);
                }
            }
        }
        // No auto-merge - create singleton cluster if configured
        if (this.config.autoCreateCluster && candidates.length === 0) {
            const cluster = await this.createClusterFromNodes(tenantId, [node], 'singleton');
            return { clusterId: cluster.clusterId, isNewCluster: true };
        }
        return { clusterId: null, isNewCluster: false };
    }
    async createClusterFromNodes(tenantId, nodes, reason) {
        const primaryNode = nodes[0];
        const edges = [];
        // Create edges between all node pairs
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const result = await this.matchingEngine.compare(nodes[i], nodes[j]);
                edges.push(this.matchingEngine.createMatchEdge(result));
            }
        }
        // Calculate canonical attributes
        const canonicalAttributes = this.calculateCanonicalAttributes(nodes);
        // Calculate cohesion
        const cohesion = nodes.length <= 1 ? 1.0 :
            edges.reduce((sum, e) => sum + e.overallScore, 0) / edges.length;
        const cluster = await IdentityClusterRepository_js_1.identityClusterRepository.create({
            tenantId,
            entityType: primaryNode.entityType,
            nodeIds: nodes.map((n) => n.nodeId),
            primaryNodeId: primaryNode.nodeId,
            canonicalAttributes,
            edges,
            cohesionScore: cohesion,
            confidence: cohesion,
        });
        // Update node cluster assignments
        await IdentityNodeRepository_js_1.identityNodeRepository.batchUpdateCluster(nodes.map((n) => n.nodeId), cluster.clusterId);
        logger.info({ clusterId: cluster.clusterId, nodeCount: nodes.length, reason }, 'Cluster created');
        return cluster;
    }
    async addNodeToCluster(node, clusterId, decidedBy) {
        return this.addNodeToClusterById(node, clusterId, decidedBy);
    }
    async addNodeToClusterById(node, clusterId, decidedBy) {
        const cluster = await IdentityClusterRepository_js_1.identityClusterRepository.getById(clusterId);
        if (!cluster) {
            throw new Error('Cluster not found');
        }
        // Get existing nodes
        const existingNodes = await Promise.all(cluster.nodeIds.map((id) => IdentityNodeRepository_js_1.identityNodeRepository.getById(id)));
        // Create edges to existing nodes
        const newEdges = [];
        for (const existingNode of existingNodes) {
            if (!existingNode)
                continue;
            const result = await this.matchingEngine.compare(node, existingNode);
            newEdges.push(this.matchingEngine.createMatchEdge(result));
        }
        // Update cluster
        cluster.nodeIds.push(node.nodeId);
        cluster.edges.push(...newEdges);
        cluster.canonicalAttributes = this.calculateCanonicalAttributes([...existingNodes.filter(Boolean), node]);
        cluster.cohesionScore = this.recalculateCohesion(cluster);
        await IdentityClusterRepository_js_1.identityClusterRepository.update(cluster);
        await IdentityNodeRepository_js_1.identityNodeRepository.updateCluster(node.nodeId, clusterId);
        logger.info({ clusterId, nodeId: node.nodeId, decidedBy }, 'Node added to cluster');
        return cluster;
    }
    calculateCanonicalAttributes(nodes) {
        const attributeMap = new Map();
        // Collect all attributes from all nodes
        for (const node of nodes) {
            for (const [key, value] of Object.entries(node.normalizedAttributes)) {
                if (!attributeMap.has(key)) {
                    attributeMap.set(key, []);
                }
                attributeMap.get(key).push({
                    value,
                    nodeId: node.nodeId,
                    confidence: node.confidence,
                });
            }
        }
        // Resolve to canonical values
        const canonicals = [];
        for (const [attribute, values] of attributeMap) {
            // Group by value
            const valueGroups = new Map();
            for (const v of values) {
                const key = String(v.value);
                if (!valueGroups.has(key)) {
                    valueGroups.set(key, []);
                }
                valueGroups.get(key).push({ nodeId: v.nodeId, confidence: v.confidence });
            }
            // Pick the value with highest aggregate confidence
            let bestValue = null;
            let bestConfidence = 0;
            let bestNodeId = '';
            const conflicts = [];
            for (const [value, sources] of valueGroups) {
                const aggregateConfidence = sources.reduce((sum, s) => sum + s.confidence, 0) / sources.length;
                if (aggregateConfidence > bestConfidence) {
                    if (bestValue !== null) {
                        conflicts.push({ value: bestValue, nodeId: bestNodeId, confidence: bestConfidence });
                    }
                    bestValue = value;
                    bestConfidence = aggregateConfidence;
                    bestNodeId = sources[0].nodeId;
                }
                else {
                    conflicts.push({ value, nodeId: sources[0].nodeId, confidence: aggregateConfidence });
                }
            }
            canonicals.push({
                attribute,
                value: bestValue,
                confidence: bestConfidence,
                sourceNodeId: bestNodeId,
                conflictingValues: conflicts.length > 0 ? conflicts : undefined,
                resolutionMethod: conflicts.length > 0 ? 'highest-confidence' : 'single-source',
            });
        }
        return canonicals;
    }
    recalculateCohesion(cluster) {
        if (cluster.nodeIds.length <= 1)
            return 1.0;
        if (cluster.edges.length === 0)
            return 0.5;
        const maxEdges = (cluster.nodeIds.length * (cluster.nodeIds.length - 1)) / 2;
        const edgeDensity = cluster.edges.length / maxEdges;
        const avgScore = cluster.edges.reduce((sum, e) => sum + e.overallScore, 0) / cluster.edges.length;
        return edgeDensity * 0.4 + avgScore * 0.6;
    }
    calculateReviewPriority(score) {
        if (score >= 0.85)
            return 'HIGH';
        if (score >= 0.75)
            return 'MEDIUM';
        return 'LOW';
    }
    buildResponse(requestId, request, node, clusterId, isNewCluster, candidates, processingTimeMs) {
        const response = {
            requestId,
            tenantId: request.tenantId,
            entityType: request.entityType,
            clusterId,
            isNewCluster,
            matchedNodeId: candidates.find((c) => c.decision === 'AUTO_MERGE')?.nodeId ?? null,
            candidates: candidates.map((c) => ({
                nodeId: c.nodeId,
                clusterId: c.clusterId ?? (0, uuid_1.v4)(), // placeholder if no cluster
                score: c.score,
                decision: c.decision,
                features: c.features,
            })),
            processingTimeMs,
            timestamp: new Date().toISOString(),
        };
        if (request.options?.includeRationale !== false && candidates.length > 0) {
            const topCandidate = candidates[0];
            response.rationale = {
                summary: this.generateRationaleSummary(topCandidate, clusterId, isNewCluster),
                topFeatures: topCandidate.features.slice(0, 5),
                decisionPath: this.describeDecisionPath(topCandidate, clusterId),
                matcherVersion: this.matchingEngine.version,
            };
        }
        return response;
    }
    generateRationaleSummary(topCandidate, clusterId, isNewCluster) {
        if (!clusterId) {
            if (topCandidate.decision === 'CANDIDATE') {
                return `Found ${topCandidate.score < 0.9 ? 'potential' : 'likely'} match with ${(topCandidate.score * 100).toFixed(0)}% confidence. Manual review recommended.`;
            }
            return 'No matching records found. Record stored for future matching.';
        }
        if (isNewCluster) {
            return `Created new identity cluster with matched record (${(topCandidate.score * 100).toFixed(0)}% confidence).`;
        }
        return `Added to existing identity cluster (${(topCandidate.score * 100).toFixed(0)}% match confidence).`;
    }
    describeDecisionPath(candidate, clusterId) {
        const topFeatures = candidate.features
            .filter((f) => f.similarity >= 0.8)
            .slice(0, 3)
            .map((f) => f.featureType.toLowerCase().replace(/_/g, ' '));
        if (candidate.decision === 'AUTO_MERGE') {
            return `Auto-merged based on strong matches on: ${topFeatures.join(', ') || 'multiple attributes'}`;
        }
        if (candidate.decision === 'CANDIDATE') {
            return `Queued for review due to moderate match score. Key matches: ${topFeatures.join(', ') || 'partial attributes'}`;
        }
        return `No automatic action taken. Score below merge threshold.`;
    }
}
exports.ResolutionService = ResolutionService;
exports.resolutionService = new ResolutionService();
