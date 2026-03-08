"use strict";
// @ts-nocheck
// CRDT (Conflict-free Replicated Data Type) Synchronization for Conductor
// Enables offline-first operation with eventual consistency across edge nodes
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crdtSyncEngine = exports.CRDTSyncEngine = void 0;
const crypto_1 = require("crypto");
const prometheus_js_1 = require("../observability/prometheus.js");
const ioredis_1 = __importDefault(require("ioredis"));
/**
 * Vector Clock for tracking causality in distributed systems
 */
class VectorClock {
    clock;
    constructor(initial) {
        this.clock = new Map(Object.entries(initial || {}));
    }
    /**
     * Increment clock for given node
     */
    tick(nodeId) {
        const current = this.clock.get(nodeId) || 0;
        this.clock.set(nodeId, current + 1);
    }
    /**
     * Update clock with incoming vector clock
     */
    update(other) {
        for (const [nodeId, timestamp] of Object.entries(other)) {
            const current = this.clock.get(nodeId) || 0;
            this.clock.set(nodeId, Math.max(current, timestamp));
        }
    }
    /**
     * Check if this clock happens before another
     */
    happensBefore(other) {
        let hasSmaller = false;
        for (const [nodeId, timestamp] of Object.entries(other)) {
            const myTimestamp = this.clock.get(nodeId) || 0;
            if (myTimestamp > timestamp) {
                return false;
            }
            if (myTimestamp < timestamp) {
                hasSmaller = true;
            }
        }
        return hasSmaller;
    }
    /**
     * Check if clocks are concurrent (neither happens before the other)
     */
    isConcurrentWith(other) {
        return !this.happensBefore(other) && !this.happensAfter(other);
    }
    /**
     * Check if this clock happens after another
     */
    happensAfter(other) {
        let hasLarger = false;
        for (const [nodeId, timestamp] of this.clock.entries()) {
            const otherTimestamp = other[nodeId] || 0;
            if (timestamp < otherTimestamp) {
                return false;
            }
            if (timestamp > otherTimestamp) {
                hasLarger = true;
            }
        }
        return hasLarger;
    }
    /**
     * Get clock as plain object
     */
    toObject() {
        return Object.fromEntries(this.clock);
    }
    /**
     * Create clock from object
     */
    static fromObject(obj) {
        return new VectorClock(obj);
    }
}
/**
 * CRDT Conflict Resolution Engine
 */
class ConflictResolver {
    /**
     * Resolve conflicts between concurrent operations
     */
    resolveConflicts(conflictingOps, strategy = 'last_write_wins') {
        switch (strategy) {
            case 'last_write_wins':
                return this.resolveByTimestamp(conflictingOps);
            case 'node_priority':
                return this.resolveByNodePriority(conflictingOps);
            case 'operation_id':
                return this.resolveByOperationId(conflictingOps);
            case 'merge_semantic':
                return this.resolveByMerging(conflictingOps);
            default:
                throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
        }
    }
    resolveByTimestamp(operations) {
        return operations.reduce((latest, current) => current.timestamp > latest.timestamp ? current : latest);
    }
    resolveByNodePriority(operations) {
        // In a real implementation, you'd look up node priority from a registry
        const nodePriorities = {
            'cloud-primary': 100,
            'cloud-secondary': 90,
            'edge-hub': 80,
            'edge-node': 70,
            'mobile-device': 60,
        };
        return operations.reduce((highest, current) => {
            const currentPriority = nodePriorities[current.nodeId] || 0;
            const highestPriority = nodePriorities[highest.nodeId] || 0;
            return currentPriority > highestPriority ? current : highest;
        });
    }
    resolveByOperationId(operations) {
        // Deterministic resolution based on operation ID
        return operations.reduce((chosen, current) => current.id > chosen.id ? current : chosen);
    }
    resolveByMerging(operations) {
        // Semantic merge of operations (entity-type specific)
        const baseOp = operations[0];
        const mergedData = operations.reduce((merged, op) => {
            return this.mergeOperationData(merged, op.data, op.entityType);
        }, baseOp.data);
        return {
            ...baseOp,
            id: `merged_${(0, crypto_1.randomUUID)()}`,
            data: mergedData,
            operation: 'merge',
            dependencies: operations.map((op) => op.id),
        };
    }
    mergeOperationData(existing, incoming, entityType) {
        switch (entityType) {
            case 'investigation':
                return this.mergeInvestigationData(existing, incoming);
            case 'intelligence_report':
                return this.mergeIntelligenceReportData(existing, incoming);
            case 'threat_indicator':
                return this.mergeThreatIndicatorData(existing, incoming);
            default:
                // Generic merge - take union of keys, prefer incoming for conflicts
                return { ...existing, ...incoming };
        }
    }
    mergeInvestigationData(existing, incoming) {
        return {
            ...existing,
            ...incoming,
            // Merge arrays without duplicates
            tags: [...new Set([...(existing.tags || []), ...(incoming.tags || [])])],
            evidence: [
                ...new Set([
                    ...(existing.evidence || []),
                    ...(incoming.evidence || []),
                ]),
            ],
            // Keep most recent status
            status: incoming.status || existing.status,
            // Merge findings
            findings: this.mergeFindingsArray(existing.findings || [], incoming.findings || []),
        };
    }
    mergeIntelligenceReportData(existing, incoming) {
        return {
            ...existing,
            ...incoming,
            // Merge confidence scores by taking average
            confidenceScore: existing.confidenceScore && incoming.confidenceScore
                ? (existing.confidenceScore + incoming.confidenceScore) / 2
                : incoming.confidenceScore || existing.confidenceScore,
            // Merge sources
            sources: [
                ...new Set([...(existing.sources || []), ...(incoming.sources || [])]),
            ],
            // Merge key insights
            keyInsights: [
                ...new Set([
                    ...(existing.keyInsights || []),
                    ...(incoming.keyInsights || []),
                ]),
            ],
        };
    }
    mergeThreatIndicatorData(existing, incoming) {
        return {
            ...existing,
            ...incoming,
            // Merge IOCs (Indicators of Compromise)
            iocs: [...new Set([...(existing.iocs || []), ...(incoming.iocs || [])])],
            // Keep highest threat level
            threatLevel: this.getHigherThreatLevel(existing.threatLevel, incoming.threatLevel),
            // Merge attributed actors
            attributedActors: [
                ...new Set([
                    ...(existing.attributedActors || []),
                    ...(incoming.attributedActors || []),
                ]),
            ],
        };
    }
    mergeFindingsArray(existing, incoming) {
        const findingsMap = new Map();
        // Add existing findings
        existing.forEach((finding) => findingsMap.set(finding.id, finding));
        // Add/update with incoming findings
        incoming.forEach((finding) => {
            if (findingsMap.has(finding.id)) {
                // Merge existing finding
                const existingFinding = findingsMap.get(finding.id);
                findingsMap.set(finding.id, { ...existingFinding, ...finding });
            }
            else {
                findingsMap.set(finding.id, finding);
            }
        });
        return Array.from(findingsMap.values());
    }
    getHigherThreatLevel(level1, level2) {
        const levels = { low: 1, medium: 2, high: 3, critical: 4 };
        const score1 = levels[level1] || 0;
        const score2 = levels[level2] || 0;
        return score1 >= score2 ? level1 : level2;
    }
}
/**
 * CRDT Synchronization Engine
 */
class CRDTSyncEngine {
    redis;
    nodeId;
    vectorClock;
    conflictResolver;
    knownNodes;
    constructor(nodeId) {
        this.redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
        this.nodeId = nodeId;
        this.vectorClock = new VectorClock({ [nodeId]: 0 });
        this.conflictResolver = new ConflictResolver();
        this.knownNodes = new Map();
    }
    /**
     * Register this node in the distributed system
     */
    async registerNode(node) {
        const fullNode = { ...node, lastSeen: Date.now() };
        await this.redis.setex(`crdt_node:${this.nodeId}`, 300, // 5 minutes TTL
        JSON.stringify(fullNode));
        await this.redis.zadd('crdt_active_nodes', Date.now(), this.nodeId);
        this.knownNodes.set(this.nodeId, fullNode);
        console.log(`Node ${this.nodeId} registered in CRDT network`);
    }
    /**
     * Apply operation locally and prepare for sync
     */
    async applyOperation(operation) {
        // Generate operation ID and assign metadata
        const operationId = (0, crypto_1.randomUUID)();
        this.vectorClock.tick(this.nodeId);
        const crdtOperation = {
            ...operation,
            id: operationId,
            nodeId: this.nodeId,
            lamportClock: this.vectorClock.toObject()[this.nodeId] || 0,
            timestamp: operation.timestamp || Date.now(),
        };
        // Store operation in local log
        await this.redis.zadd(`crdt_log:${this.nodeId}`, crdtOperation.lamportClock, JSON.stringify(crdtOperation));
        // Store in global operation log for sync
        await this.redis.zadd('crdt_global_log', crdtOperation.timestamp, JSON.stringify(crdtOperation));
        // Update entity state
        await this.updateEntityState(crdtOperation);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('crdt_operation_applied', { success: true });
        console.log(`Operation ${operationId} applied locally`);
        return operationId;
    }
    /**
     * Sync with another node
     */
    async syncWithNode(targetNodeId, maxOperations = 1000) {
        try {
            // Get target node's vector clock
            const targetNodeData = await this.redis.get(`crdt_node:${targetNodeId}`);
            if (!targetNodeData) {
                throw new Error(`Target node ${targetNodeId} not found`);
            }
            const targetNode = JSON.parse(targetNodeData);
            const targetVectorClock = await this.getNodeVectorClock(targetNodeId);
            // Determine operations to send
            const operationsToSend = await this.getOperationsSince(targetVectorClock, maxOperations);
            // Create sync request
            const syncRequest = {
                requestId: (0, crypto_1.randomUUID)(),
                sourceNodeId: this.nodeId,
                targetNodeId,
                vectorClock: this.vectorClock.toObject(),
                maxOperations,
            };
            // Send operations and receive response
            const syncResponse = {
                requestId: syncRequest.requestId,
                operations: operationsToSend,
                vectorClock: this.vectorClock.toObject(),
                hasMore: operationsToSend.length >= maxOperations,
                syncComplete: operationsToSend.length < maxOperations,
                conflictsDetected: [],
            };
            // Update sync metrics
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('crdt_operations_sent', operationsToSend.length);
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('crdt_sync_completed', syncResponse.syncComplete);
            console.log(`Sync with ${targetNodeId} completed: ${operationsToSend.length} operations sent`);
            return syncResponse;
        }
        catch (error) {
            console.error(`Sync with ${targetNodeId} failed:`, error);
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('crdt_sync_error', { success: false });
            throw error;
        }
    }
    /**
     * Receive and apply operations from another node
     */
    async receiveOperations(operations) {
        const conflicts = [];
        for (const operation of operations) {
            try {
                await this.applyRemoteOperation(operation);
            }
            catch (error) {
                if (error instanceof ConflictError) {
                    conflicts.push(error.conflictInfo);
                }
                else {
                    console.error(`Failed to apply operation ${operation.id}:`, error);
                }
            }
        }
        // Update vector clock with received operations
        this.updateVectorClockFromOperations(operations);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('crdt_operations_received', operations.length);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('crdt_conflicts_detected', conflicts.length);
        return conflicts;
    }
    /**
     * Apply remote operation with conflict detection
     */
    async applyRemoteOperation(operation) {
        // Check for conflicts with local operations
        const localOperations = await this.getConflictingOperations(operation);
        if (localOperations.length > 0) {
            // Resolve conflict
            const allOperations = [...localOperations, operation];
            const resolvedOperation = this.conflictResolver.resolveConflicts(allOperations);
            if (resolvedOperation.id !== operation.id) {
                // Local operation wins, but log the conflict
                const conflictInfo = {
                    entityId: operation.entityId,
                    entityType: operation.entityType,
                    conflictingOperations: allOperations.map((op) => op.id),
                    resolution: 'automatic',
                    resolutionStrategy: 'last_write_wins',
                };
                throw new ConflictError(conflictInfo);
            }
        }
        // Apply the operation
        await this.redis.zadd(`crdt_log:${this.nodeId}`, operation.lamportClock, JSON.stringify(operation));
        await this.updateEntityState(operation);
    }
    /**
     * Update entity state based on operation
     */
    async updateEntityState(operation) {
        const entityKey = `entity:${operation.entityType}:${operation.entityId}`;
        switch (operation.operation) {
            case 'create':
                await this.redis.set(entityKey, JSON.stringify(operation.data));
                break;
            case 'update':
                const existing = await this.redis.get(entityKey);
                if (existing) {
                    const existingData = JSON.parse(existing);
                    const updatedData = { ...existingData, ...operation.data };
                    await this.redis.set(entityKey, JSON.stringify(updatedData));
                }
                else {
                    // Create if doesn't exist
                    await this.redis.set(entityKey, JSON.stringify(operation.data));
                }
                break;
            case 'delete':
                await this.redis.del(entityKey);
                break;
            case 'merge':
                // Custom merge logic already handled by conflict resolver
                await this.redis.set(entityKey, JSON.stringify(operation.data));
                break;
        }
        // Update entity metadata
        await this.redis.hset(`${entityKey}:meta`, {
            lastModified: operation.timestamp,
            modifiedBy: operation.nodeId,
            operationId: operation.id,
        });
    }
    /**
     * Get operations since given vector clock
     */
    async getOperationsSince(vectorClock, limit) {
        const operations = [];
        const myVectorClock = this.vectorClock.toObject();
        // Get operations that are newer than target's vector clock
        for (const [nodeId, timestamp] of Object.entries(myVectorClock)) {
            const targetTimestamp = vectorClock[nodeId] || 0;
            if (timestamp > targetTimestamp) {
                // Get operations from this node that are newer
                const nodeOperations = await this.redis.zrangebyscore(`crdt_log:${nodeId}`, targetTimestamp + 1, timestamp, 'LIMIT', 0, limit - operations.length);
                for (const opJson of nodeOperations) {
                    operations.push(JSON.parse(opJson));
                    if (operations.length >= limit)
                        break;
                }
                if (operations.length >= limit)
                    break;
            }
        }
        return operations.sort((a, b) => a.lamportClock - b.lamportClock);
    }
    /**
     * Get node's current vector clock
     */
    async getNodeVectorClock(nodeId) {
        const clockData = await this.redis.get(`vector_clock:${nodeId}`);
        return clockData ? JSON.parse(clockData) : {};
    }
    /**
     * Find conflicting operations for a given operation
     */
    async getConflictingOperations(operation) {
        const entityKey = `entity:${operation.entityType}:${operation.entityId}`;
        const meta = await this.redis.hgetall(`${entityKey}:meta`);
        if (!meta.lastModified)
            return [];
        // Look for operations on same entity around the same time
        const timeWindow = 60000; // 1 minute window
        const startTime = operation.timestamp - timeWindow;
        const endTime = operation.timestamp + timeWindow;
        const possibleConflicts = await this.redis.zrangebyscore('crdt_global_log', startTime, endTime);
        const conflicts = [];
        for (const opJson of possibleConflicts) {
            const op = JSON.parse(opJson);
            if (op.entityId === operation.entityId &&
                op.entityType === operation.entityType &&
                op.nodeId !== operation.nodeId) {
                conflicts.push(op);
            }
        }
        return conflicts;
    }
    /**
     * Update vector clock from received operations
     */
    updateVectorClockFromOperations(operations) {
        const remoteClocks = {};
        operations.forEach((op) => {
            remoteClocks[op.nodeId] = Math.max(remoteClocks[op.nodeId] || 0, op.lamportClock);
        });
        this.vectorClock.update(remoteClocks);
        // Persist updated vector clock
        this.redis.set(`vector_clock:${this.nodeId}`, JSON.stringify(this.vectorClock.toObject()));
    }
    /**
     * Get sync status with all known nodes
     */
    async getSyncStatus() {
        // Get active nodes
        const activeNodeIds = await this.redis.zrevrange('crdt_active_nodes', 0, -1);
        const activeNodes = [];
        for (const nodeId of activeNodeIds) {
            const nodeData = await this.redis.get(`crdt_node:${nodeId}`);
            if (nodeData) {
                const node = JSON.parse(nodeData);
                // Only include nodes seen in last 10 minutes
                if (Date.now() - node.lastSeen < 600000) {
                    activeNodes.push(node);
                }
            }
        }
        // Count pending operations
        const pendingOperations = await this.redis.zcard(`crdt_log:${this.nodeId}`);
        // Get last sync times (mock data for now)
        const lastSyncTimes = {};
        for (const node of activeNodes) {
            if (node.nodeId !== this.nodeId) {
                const syncData = await this.redis.get(`last_sync:${this.nodeId}:${node.nodeId}`);
                lastSyncTimes[node.nodeId] = syncData ? parseInt(syncData) : 0;
            }
        }
        return {
            nodeId: this.nodeId,
            vectorClock: this.vectorClock.toObject(),
            activeNodes,
            pendingOperations,
            lastSyncTimes,
        };
    }
    async disconnect() {
        await this.redis.quit();
    }
}
exports.CRDTSyncEngine = CRDTSyncEngine;
/**
 * Custom error for CRDT conflicts
 */
class ConflictError extends Error {
    conflictInfo;
    constructor(conflictInfo) {
        super(`CRDT conflict detected for ${conflictInfo.entityType}:${conflictInfo.entityId}`);
        this.conflictInfo = conflictInfo;
        this.name = 'ConflictError';
    }
}
// Export singleton with environment-based node ID
const nodeId = process.env.CRDT_NODE_ID ||
    `conductor-${(0, crypto_1.randomUUID)().substring(0, 8)}`;
exports.crdtSyncEngine = new CRDTSyncEngine(nodeId);
