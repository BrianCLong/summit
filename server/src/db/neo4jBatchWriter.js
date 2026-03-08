"use strict";
/**
 * Neo4j Batch Writer
 *
 * Buffers Neo4j write operations and executes them in batches for improved performance.
 * Uses UNWIND for bulk operations, reducing round-trips and transaction overhead.
 *
 * SOC 2 Controls: CC7.1 (System Operations), CC7.2 (Change Management)
 *
 * @module db/neo4jBatchWriter
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Neo4jBatchWriter = void 0;
exports.getNeo4jBatchWriter = getNeo4jBatchWriter;
const uuid_1 = require("uuid");
const neo4j_js_1 = require("./neo4j.js");
const data_envelope_js_1 = require("../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
        policyId: 'neo4j-batch-policy',
        result,
        decidedAt: new Date(),
        reason,
        evaluator: 'Neo4jBatchWriter',
    };
}
// ============================================================================
// Default Configuration
// ============================================================================
const DEFAULT_CONFIG = {
    maxBatchSize: 500,
    flushIntervalMs: 100,
    maxBufferSize: 5000,
    useTransactions: true,
    retryOnFailure: true,
    maxRetries: 3,
};
// ============================================================================
// Neo4j Batch Writer
// ============================================================================
class Neo4jBatchWriter {
    buffer = new Map();
    config;
    stats;
    flushTimer = null;
    isShuttingDown = false;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.stats = {
            totalOperations: 0,
            batchesExecuted: 0,
            failedBatches: 0,
            retriedBatches: 0,
            averageBatchSize: 0,
            lastFlushTime: null,
            bufferSize: 0,
        };
        // Initialize buffers for each operation type
        this.buffer.set('CREATE_NODE', []);
        this.buffer.set('CREATE_RELATIONSHIP', []);
        this.buffer.set('UPDATE_NODE', []);
        this.buffer.set('DELETE_NODE', []);
        this.buffer.set('DELETE_RELATIONSHIP', []);
        // Start flush timer
        this.startFlushTimer();
        logger_js_1.default.info({ config: this.config }, 'Neo4jBatchWriter initialized');
    }
    // --------------------------------------------------------------------------
    // Public API - Queue Operations
    // --------------------------------------------------------------------------
    /**
     * Queue a node creation operation
     */
    queueCreateNode(label, properties, tenantId) {
        const operation = {
            id: (0, uuid_1.v4)(),
            type: 'CREATE_NODE',
            label,
            properties: { ...properties, id: properties.id || (0, uuid_1.v4)() },
            tenantId,
            queuedAt: Date.now(),
        };
        this.addToBuffer(operation);
        return (0, data_envelope_js_1.createDataEnvelope)(operation.id, {
            source: 'Neo4jBatchWriter',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Node creation queued'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Queue a relationship creation operation
     */
    queueCreateRelationship(sourceId, targetId, relationshipType, properties, tenantId) {
        const operation = {
            id: (0, uuid_1.v4)(),
            type: 'CREATE_RELATIONSHIP',
            sourceId,
            targetId,
            relationshipType,
            properties,
            tenantId,
            queuedAt: Date.now(),
        };
        this.addToBuffer(operation);
        return (0, data_envelope_js_1.createDataEnvelope)(operation.id, {
            source: 'Neo4jBatchWriter',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Relationship creation queued'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Queue a node update operation
     */
    queueUpdateNode(nodeId, properties, tenantId) {
        const operation = {
            id: (0, uuid_1.v4)(),
            type: 'UPDATE_NODE',
            nodeId,
            properties,
            tenantId,
            queuedAt: Date.now(),
        };
        this.addToBuffer(operation);
        return (0, data_envelope_js_1.createDataEnvelope)(operation.id, {
            source: 'Neo4jBatchWriter',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Node update queued'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Queue a node deletion operation
     */
    queueDeleteNode(nodeId, tenantId) {
        const operation = {
            id: (0, uuid_1.v4)(),
            type: 'DELETE_NODE',
            nodeId,
            tenantId,
            queuedAt: Date.now(),
        };
        this.addToBuffer(operation);
        return (0, data_envelope_js_1.createDataEnvelope)(operation.id, {
            source: 'Neo4jBatchWriter',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Node deletion queued'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Queue a relationship deletion operation
     */
    queueDeleteRelationship(sourceId, targetId, relationshipType, tenantId) {
        const operation = {
            id: (0, uuid_1.v4)(),
            type: 'DELETE_RELATIONSHIP',
            sourceId,
            targetId,
            relationshipType,
            tenantId,
            queuedAt: Date.now(),
        };
        this.addToBuffer(operation);
        return (0, data_envelope_js_1.createDataEnvelope)(operation.id, {
            source: 'Neo4jBatchWriter',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Relationship deletion queued'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    // --------------------------------------------------------------------------
    // Flush Operations
    // --------------------------------------------------------------------------
    /**
     * Force flush all buffered operations
     */
    async flush() {
        const allResults = [];
        for (const [type, operations] of this.buffer) {
            if (operations.length === 0)
                continue;
            // Take operations from buffer
            const batch = operations.splice(0, operations.length);
            this.stats.bufferSize -= batch.length;
            try {
                const results = await this.executeBatch(type, batch);
                allResults.push(...results);
            }
            catch (error) {
                logger_js_1.default.error({ error, type, count: batch.length }, 'Batch execution failed');
                this.stats.failedBatches++;
                // Add failure results
                for (const op of batch) {
                    allResults.push({
                        operationId: op.id,
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
                // Retry if configured
                if (this.config.retryOnFailure) {
                    await this.retryBatch(type, batch);
                }
            }
        }
        this.stats.lastFlushTime = Date.now();
        return (0, data_envelope_js_1.createDataEnvelope)(allResults, {
            source: 'Neo4jBatchWriter',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, `Flushed ${allResults.length} operations`),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    // --------------------------------------------------------------------------
    // Batch Execution
    // --------------------------------------------------------------------------
    async executeBatch(type, operations) {
        if ((0, neo4j_js_1.isNeo4jMockMode)()) {
            logger_js_1.default.warn({ type, count: operations.length }, 'Neo4j in mock mode, skipping batch');
            return operations.map(op => ({ operationId: op.id, success: true }));
        }
        const driver = (0, neo4j_js_1.getNeo4jDriver)();
        const session = driver.session();
        try {
            let results;
            if (this.config.useTransactions) {
                const tx = session.beginTransaction();
                try {
                    results = await this.executeOperations(tx, type, operations);
                    await tx.commit();
                }
                catch (error) {
                    await tx.rollback();
                    throw error;
                }
            }
            else {
                results = await this.executeOperations(session, type, operations);
            }
            this.stats.batchesExecuted++;
            this.stats.totalOperations += operations.length;
            this.updateAverageBatchSize(operations.length);
            logger_js_1.default.debug({ type, count: operations.length }, 'Batch executed successfully');
            return results;
        }
        finally {
            await session.close();
        }
    }
    async executeOperations(runner, type, operations) {
        switch (type) {
            case 'CREATE_NODE':
                return this.executeCreateNodes(runner, operations);
            case 'CREATE_RELATIONSHIP':
                return this.executeCreateRelationships(runner, operations);
            case 'UPDATE_NODE':
                return this.executeUpdateNodes(runner, operations);
            case 'DELETE_NODE':
                return this.executeDeleteNodes(runner, operations);
            case 'DELETE_RELATIONSHIP':
                return this.executeDeleteRelationships(runner, operations);
            default:
                throw new Error(`Unknown operation type: ${type}`);
        }
    }
    async executeCreateNodes(runner, operations) {
        // Group by label for efficient UNWIND
        const byLabel = new Map();
        for (const op of operations) {
            const label = op.label || 'Node';
            const ops = byLabel.get(label) || [];
            ops.push(op);
            byLabel.set(label, ops);
        }
        const results = [];
        for (const [label, ops] of byLabel) {
            const query = `
        UNWIND $operations AS op
        CREATE (n:${label} {id: op.id, tenantId: op.tenantId})
        SET n += op.properties
        RETURN n.id AS nodeId
      `;
            const params = {
                operations: ops.map(op => ({
                    id: op.properties?.id || op.id,
                    tenantId: op.tenantId,
                    properties: op.properties || {},
                })),
            };
            await runner.run(query, params);
            for (const op of ops) {
                results.push({
                    operationId: op.id,
                    success: true,
                    nodeId: op.properties?.id || op.id,
                });
            }
        }
        return results;
    }
    async executeCreateRelationships(runner, operations) {
        // Group by relationship type
        const byType = new Map();
        for (const op of operations) {
            const relType = op.relationshipType || 'RELATES_TO';
            const ops = byType.get(relType) || [];
            ops.push(op);
            byType.set(relType, ops);
        }
        const results = [];
        for (const [relType, ops] of byType) {
            const query = `
        UNWIND $operations AS op
        MATCH (a {id: op.sourceId, tenantId: op.tenantId})
        MATCH (b {id: op.targetId, tenantId: op.tenantId})
        CREATE (a)-[r:${relType}]->(b)
        SET r += op.properties
        RETURN a.id AS sourceId, b.id AS targetId
      `;
            const params = {
                operations: ops.map(op => ({
                    sourceId: op.sourceId,
                    targetId: op.targetId,
                    tenantId: op.tenantId,
                    properties: op.properties || {},
                })),
            };
            await runner.run(query, params);
            for (const op of ops) {
                results.push({
                    operationId: op.id,
                    success: true,
                });
            }
        }
        return results;
    }
    async executeUpdateNodes(runner, operations) {
        const query = `
      UNWIND $operations AS op
      MATCH (n {id: op.nodeId, tenantId: op.tenantId})
      SET n += op.properties
      RETURN n.id AS nodeId
    `;
        const params = {
            operations: operations.map(op => ({
                nodeId: op.nodeId,
                tenantId: op.tenantId,
                properties: op.properties || {},
            })),
        };
        await runner.run(query, params);
        return operations.map(op => ({
            operationId: op.id,
            success: true,
            nodeId: op.nodeId,
        }));
    }
    async executeDeleteNodes(runner, operations) {
        const query = `
      UNWIND $operations AS op
      MATCH (n {id: op.nodeId, tenantId: op.tenantId})
      DETACH DELETE n
    `;
        const params = {
            operations: operations.map(op => ({
                nodeId: op.nodeId,
                tenantId: op.tenantId,
            })),
        };
        await runner.run(query, params);
        return operations.map(op => ({
            operationId: op.id,
            success: true,
        }));
    }
    async executeDeleteRelationships(runner, operations) {
        // Group by relationship type
        const byType = new Map();
        for (const op of operations) {
            const relType = op.relationshipType || 'RELATES_TO';
            const ops = byType.get(relType) || [];
            ops.push(op);
            byType.set(relType, ops);
        }
        const results = [];
        for (const [relType, ops] of byType) {
            const query = `
        UNWIND $operations AS op
        MATCH (a {id: op.sourceId, tenantId: op.tenantId})-[r:${relType}]->(b {id: op.targetId, tenantId: op.tenantId})
        DELETE r
      `;
            const params = {
                operations: ops.map(op => ({
                    sourceId: op.sourceId,
                    targetId: op.targetId,
                    tenantId: op.tenantId,
                })),
            };
            await runner.run(query, params);
            for (const op of ops) {
                results.push({
                    operationId: op.id,
                    success: true,
                });
            }
        }
        return results;
    }
    // --------------------------------------------------------------------------
    // Retry Logic
    // --------------------------------------------------------------------------
    async retryBatch(type, operations, attempt = 1) {
        if (attempt > this.config.maxRetries) {
            logger_js_1.default.error({ type, count: operations.length, attempts: attempt }, 'Batch retry exhausted');
            return;
        }
        this.stats.retriedBatches++;
        // Exponential backoff with jitter
        const baseDelay = 100 * Math.pow(2, attempt - 1);
        const jitter = baseDelay * (0.5 + Math.random() * 0.5);
        await this.sleep(jitter);
        try {
            await this.executeBatch(type, operations);
            logger_js_1.default.info({ type, count: operations.length, attempt }, 'Batch retry succeeded');
        }
        catch (error) {
            logger_js_1.default.warn({ error, type, attempt }, 'Batch retry failed, will retry');
            await this.retryBatch(type, operations, attempt + 1);
        }
    }
    // --------------------------------------------------------------------------
    // Buffer Management
    // --------------------------------------------------------------------------
    addToBuffer(operation) {
        const typeBuffer = this.buffer.get(operation.type);
        if (!typeBuffer) {
            throw new Error(`Unknown operation type: ${operation.type}`);
        }
        typeBuffer.push(operation);
        this.stats.bufferSize++;
        // Check if we need to flush
        if (this.stats.bufferSize >= this.config.maxBufferSize) {
            logger_js_1.default.warn({ bufferSize: this.stats.bufferSize }, 'Buffer full, forcing flush');
            setImmediate(() => this.flush());
        }
        else if (typeBuffer.length >= this.config.maxBatchSize) {
            setImmediate(() => this.flushType(operation.type));
        }
    }
    async flushType(type) {
        const operations = this.buffer.get(type);
        if (!operations || operations.length === 0)
            return;
        const batch = operations.splice(0, this.config.maxBatchSize);
        this.stats.bufferSize -= batch.length;
        try {
            await this.executeBatch(type, batch);
        }
        catch (error) {
            logger_js_1.default.error({ error, type, count: batch.length }, 'Type flush failed');
            this.stats.failedBatches++;
            if (this.config.retryOnFailure) {
                await this.retryBatch(type, batch);
            }
        }
    }
    // --------------------------------------------------------------------------
    // Timer Management
    // --------------------------------------------------------------------------
    startFlushTimer() {
        if (this.flushTimer)
            return;
        this.flushTimer = setInterval(async () => {
            if (this.isShuttingDown)
                return;
            const totalBuffered = Array.from(this.buffer.values())
                .reduce((sum, ops) => sum + ops.length, 0);
            if (totalBuffered > 0) {
                await this.flush();
            }
        }, this.config.flushIntervalMs);
    }
    stopFlushTimer() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
    }
    // --------------------------------------------------------------------------
    // Stats & Utilities
    // --------------------------------------------------------------------------
    updateAverageBatchSize(batchSize) {
        const currentTotal = this.stats.averageBatchSize * (this.stats.batchesExecuted - 1);
        this.stats.averageBatchSize = (currentTotal + batchSize) / this.stats.batchesExecuted;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Get current buffer statistics
     */
    getStats() {
        return (0, data_envelope_js_1.createDataEnvelope)({ ...this.stats }, {
            source: 'Neo4jBatchWriter',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Stats retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Get pending operation count by type
     */
    getPendingCounts() {
        const counts = {
            CREATE_NODE: 0,
            CREATE_RELATIONSHIP: 0,
            UPDATE_NODE: 0,
            DELETE_NODE: 0,
            DELETE_RELATIONSHIP: 0,
        };
        for (const [type, operations] of this.buffer) {
            counts[type] = operations.length;
        }
        return (0, data_envelope_js_1.createDataEnvelope)(counts, {
            source: 'Neo4jBatchWriter',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Pending counts retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Shutdown the batch writer
     */
    async shutdown() {
        this.isShuttingDown = true;
        this.stopFlushTimer();
        // Final flush
        const results = await this.flush();
        logger_js_1.default.info({ finalOperations: results.data.length }, 'Neo4jBatchWriter shutdown complete');
        return (0, data_envelope_js_1.createDataEnvelope)(true, {
            source: 'Neo4jBatchWriter',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Shutdown complete'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
}
exports.Neo4jBatchWriter = Neo4jBatchWriter;
// Export singleton factory
let instance = null;
function getNeo4jBatchWriter(config) {
    if (!instance) {
        instance = new Neo4jBatchWriter(config);
    }
    return instance;
}
exports.default = Neo4jBatchWriter;
