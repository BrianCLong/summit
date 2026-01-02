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

import { v4 as uuidv4 } from 'uuid';
import { getNeo4jDriver, isNeo4jMockMode } from './neo4j.js';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../types/data-envelope.js';
import logger from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export type BatchOperationType = 'CREATE_NODE' | 'CREATE_RELATIONSHIP' | 'UPDATE_NODE' | 'DELETE_NODE' | 'DELETE_RELATIONSHIP';

export interface BatchOperation {
  id: string;
  type: BatchOperationType;
  label?: string;
  properties?: Record<string, unknown>;
  tenantId: string;
  // For relationships
  sourceId?: string;
  targetId?: string;
  relationshipType?: string;
  // For updates/deletes
  nodeId?: string;
  // Timestamp
  queuedAt: number;
}

export interface BatchWriterConfig {
  /** Maximum batch size before flush */
  maxBatchSize: number;
  /** Flush interval in ms */
  flushIntervalMs: number;
  /** Maximum operations to buffer before forcing flush */
  maxBufferSize: number;
  /** Enable transaction per batch */
  useTransactions: boolean;
  /** Retry failed batches */
  retryOnFailure: boolean;
  /** Maximum retries for failed batches */
  maxRetries: number;
}

export interface BatchWriterStats {
  totalOperations: number;
  batchesExecuted: number;
  failedBatches: number;
  retriedBatches: number;
  averageBatchSize: number;
  lastFlushTime: number | null;
  bufferSize: number;
}

export interface BatchResult {
  operationId: string;
  success: boolean;
  error?: string;
  nodeId?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
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

const DEFAULT_CONFIG: BatchWriterConfig = {
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

export class Neo4jBatchWriter {
  private buffer: Map<BatchOperationType, BatchOperation[]> = new Map();
  private config: BatchWriterConfig;
  private stats: BatchWriterStats;
  private flushTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor(config: Partial<BatchWriterConfig> = {}) {
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

    logger.info({ config: this.config }, 'Neo4jBatchWriter initialized');
  }

  // --------------------------------------------------------------------------
  // Public API - Queue Operations
  // --------------------------------------------------------------------------

  /**
   * Queue a node creation operation
   */
  queueCreateNode(
    label: string,
    properties: Record<string, unknown>,
    tenantId: string
  ): DataEnvelope<string> {
    const operation: BatchOperation = {
      id: uuidv4(),
      type: 'CREATE_NODE',
      label,
      properties: { ...properties, id: properties.id || uuidv4() },
      tenantId,
      queuedAt: Date.now(),
    };

    this.addToBuffer(operation);

    return createDataEnvelope(operation.id, {
      source: 'Neo4jBatchWriter',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Node creation queued'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Queue a relationship creation operation
   */
  queueCreateRelationship(
    sourceId: string,
    targetId: string,
    relationshipType: string,
    properties: Record<string, unknown>,
    tenantId: string
  ): DataEnvelope<string> {
    const operation: BatchOperation = {
      id: uuidv4(),
      type: 'CREATE_RELATIONSHIP',
      sourceId,
      targetId,
      relationshipType,
      properties,
      tenantId,
      queuedAt: Date.now(),
    };

    this.addToBuffer(operation);

    return createDataEnvelope(operation.id, {
      source: 'Neo4jBatchWriter',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Relationship creation queued'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Queue a node update operation
   */
  queueUpdateNode(
    nodeId: string,
    properties: Record<string, unknown>,
    tenantId: string
  ): DataEnvelope<string> {
    const operation: BatchOperation = {
      id: uuidv4(),
      type: 'UPDATE_NODE',
      nodeId,
      properties,
      tenantId,
      queuedAt: Date.now(),
    };

    this.addToBuffer(operation);

    return createDataEnvelope(operation.id, {
      source: 'Neo4jBatchWriter',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Node update queued'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Queue a node deletion operation
   */
  queueDeleteNode(nodeId: string, tenantId: string): DataEnvelope<string> {
    const operation: BatchOperation = {
      id: uuidv4(),
      type: 'DELETE_NODE',
      nodeId,
      tenantId,
      queuedAt: Date.now(),
    };

    this.addToBuffer(operation);

    return createDataEnvelope(operation.id, {
      source: 'Neo4jBatchWriter',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Node deletion queued'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Queue a relationship deletion operation
   */
  queueDeleteRelationship(
    sourceId: string,
    targetId: string,
    relationshipType: string,
    tenantId: string
  ): DataEnvelope<string> {
    const operation: BatchOperation = {
      id: uuidv4(),
      type: 'DELETE_RELATIONSHIP',
      sourceId,
      targetId,
      relationshipType,
      tenantId,
      queuedAt: Date.now(),
    };

    this.addToBuffer(operation);

    return createDataEnvelope(operation.id, {
      source: 'Neo4jBatchWriter',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Relationship deletion queued'),
      classification: DataClassification.INTERNAL,
    });
  }

  // --------------------------------------------------------------------------
  // Flush Operations
  // --------------------------------------------------------------------------

  /**
   * Force flush all buffered operations
   */
  async flush(): Promise<DataEnvelope<BatchResult[]>> {
    const allResults: BatchResult[] = [];

    for (const [type, operations] of this.buffer) {
      if (operations.length === 0) continue;

      // Take operations from buffer
      const batch = operations.splice(0, operations.length);
      this.stats.bufferSize -= batch.length;

      try {
        const results = await this.executeBatch(type, batch);
        allResults.push(...results);
      } catch (error: any) {
        logger.error({ error, type, count: batch.length }, 'Batch execution failed');
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

    return createDataEnvelope(allResults, {
      source: 'Neo4jBatchWriter',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, `Flushed ${allResults.length} operations`),
      classification: DataClassification.INTERNAL,
    });
  }

  // --------------------------------------------------------------------------
  // Batch Execution
  // --------------------------------------------------------------------------

  private async executeBatch(type: BatchOperationType, operations: BatchOperation[]): Promise<BatchResult[]> {
    if (isNeo4jMockMode()) {
      logger.warn({ type, count: operations.length }, 'Neo4j in mock mode, skipping batch');
      return operations.map(op => ({ operationId: op.id, success: true }));
    }

    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
      let results: BatchResult[];

      if (this.config.useTransactions) {
        const tx = session.beginTransaction();
        try {
          results = await this.executeOperations(tx, type, operations);
          await tx.commit();
        } catch (error: any) {
          await tx.rollback();
          throw error;
        }
      } else {
        results = await this.executeOperations(session, type, operations);
      }

      this.stats.batchesExecuted++;
      this.stats.totalOperations += operations.length;
      this.updateAverageBatchSize(operations.length);

      logger.debug({ type, count: operations.length }, 'Batch executed successfully');
      return results;
    } finally {
      await session.close();
    }
  }

  private async executeOperations(
    runner: { run: (query: string, params?: Record<string, unknown>) => Promise<unknown> },
    type: BatchOperationType,
    operations: BatchOperation[]
  ): Promise<BatchResult[]> {
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

  private async executeCreateNodes(
    runner: { run: (query: string, params?: Record<string, unknown>) => Promise<unknown> },
    operations: BatchOperation[]
  ): Promise<BatchResult[]> {
    // Group by label for efficient UNWIND
    const byLabel = new Map<string, BatchOperation[]>();
    for (const op of operations) {
      const label = op.label || 'Node';
      const ops = byLabel.get(label) || [];
      ops.push(op);
      byLabel.set(label, ops);
    }

    const results: BatchResult[] = [];

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
          nodeId: (op.properties?.id as string) || op.id,
        });
      }
    }

    return results;
  }

  private async executeCreateRelationships(
    runner: { run: (query: string, params?: Record<string, unknown>) => Promise<unknown> },
    operations: BatchOperation[]
  ): Promise<BatchResult[]> {
    // Group by relationship type
    const byType = new Map<string, BatchOperation[]>();
    for (const op of operations) {
      const relType = op.relationshipType || 'RELATES_TO';
      const ops = byType.get(relType) || [];
      ops.push(op);
      byType.set(relType, ops);
    }

    const results: BatchResult[] = [];

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

  private async executeUpdateNodes(
    runner: { run: (query: string, params?: Record<string, unknown>) => Promise<unknown> },
    operations: BatchOperation[]
  ): Promise<BatchResult[]> {
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

  private async executeDeleteNodes(
    runner: { run: (query: string, params?: Record<string, unknown>) => Promise<unknown> },
    operations: BatchOperation[]
  ): Promise<BatchResult[]> {
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

  private async executeDeleteRelationships(
    runner: { run: (query: string, params?: Record<string, unknown>) => Promise<unknown> },
    operations: BatchOperation[]
  ): Promise<BatchResult[]> {
    // Group by relationship type
    const byType = new Map<string, BatchOperation[]>();
    for (const op of operations) {
      const relType = op.relationshipType || 'RELATES_TO';
      const ops = byType.get(relType) || [];
      ops.push(op);
      byType.set(relType, ops);
    }

    const results: BatchResult[] = [];

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

  private async retryBatch(type: BatchOperationType, operations: BatchOperation[], attempt = 1): Promise<void> {
    if (attempt > this.config.maxRetries) {
      logger.error({ type, count: operations.length, attempts: attempt }, 'Batch retry exhausted');
      return;
    }

    this.stats.retriedBatches++;

    // Exponential backoff with jitter
    const baseDelay = 100 * Math.pow(2, attempt - 1);
    const jitter = baseDelay * (0.5 + Math.random() * 0.5);
    await this.sleep(jitter);

    try {
      await this.executeBatch(type, operations);
      logger.info({ type, count: operations.length, attempt }, 'Batch retry succeeded');
    } catch (error: any) {
      logger.warn({ error, type, attempt }, 'Batch retry failed, will retry');
      await this.retryBatch(type, operations, attempt + 1);
    }
  }

  // --------------------------------------------------------------------------
  // Buffer Management
  // --------------------------------------------------------------------------

  private addToBuffer(operation: BatchOperation): void {
    const typeBuffer = this.buffer.get(operation.type);
    if (!typeBuffer) {
      throw new Error(`Unknown operation type: ${operation.type}`);
    }

    typeBuffer.push(operation);
    this.stats.bufferSize++;

    // Check if we need to flush
    if (this.stats.bufferSize >= this.config.maxBufferSize) {
      logger.warn({ bufferSize: this.stats.bufferSize }, 'Buffer full, forcing flush');
      setImmediate(() => this.flush());
    } else if (typeBuffer.length >= this.config.maxBatchSize) {
      setImmediate(() => this.flushType(operation.type));
    }
  }

  private async flushType(type: BatchOperationType): Promise<void> {
    const operations = this.buffer.get(type);
    if (!operations || operations.length === 0) return;

    const batch = operations.splice(0, this.config.maxBatchSize);
    this.stats.bufferSize -= batch.length;

    try {
      await this.executeBatch(type, batch);
    } catch (error: any) {
      logger.error({ error, type, count: batch.length }, 'Type flush failed');
      this.stats.failedBatches++;

      if (this.config.retryOnFailure) {
        await this.retryBatch(type, batch);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Timer Management
  // --------------------------------------------------------------------------

  private startFlushTimer(): void {
    if (this.flushTimer) return;

    this.flushTimer = setInterval(async () => {
      if (this.isShuttingDown) return;

      const totalBuffered = Array.from(this.buffer.values())
        .reduce((sum, ops) => sum + ops.length, 0);

      if (totalBuffered > 0) {
        await this.flush();
      }
    }, this.config.flushIntervalMs);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // --------------------------------------------------------------------------
  // Stats & Utilities
  // --------------------------------------------------------------------------

  private updateAverageBatchSize(batchSize: number): void {
    const currentTotal = this.stats.averageBatchSize * (this.stats.batchesExecuted - 1);
    this.stats.averageBatchSize = (currentTotal + batchSize) / this.stats.batchesExecuted;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current buffer statistics
   */
  getStats(): DataEnvelope<BatchWriterStats> {
    return createDataEnvelope({ ...this.stats }, {
      source: 'Neo4jBatchWriter',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Stats retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Get pending operation count by type
   */
  getPendingCounts(): DataEnvelope<Record<BatchOperationType, number>> {
    const counts: Record<BatchOperationType, number> = {
      CREATE_NODE: 0,
      CREATE_RELATIONSHIP: 0,
      UPDATE_NODE: 0,
      DELETE_NODE: 0,
      DELETE_RELATIONSHIP: 0,
    };

    for (const [type, operations] of this.buffer) {
      counts[type] = operations.length;
    }

    return createDataEnvelope(counts, {
      source: 'Neo4jBatchWriter',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Pending counts retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Shutdown the batch writer
   */
  async shutdown(): Promise<DataEnvelope<boolean>> {
    this.isShuttingDown = true;
    this.stopFlushTimer();

    // Final flush
    const results = await this.flush();
    logger.info({ finalOperations: results.data.length }, 'Neo4jBatchWriter shutdown complete');

    return createDataEnvelope(true, {
      source: 'Neo4jBatchWriter',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Shutdown complete'),
      classification: DataClassification.INTERNAL,
    });
  }
}

// Export singleton factory
let instance: Neo4jBatchWriter | null = null;

export function getNeo4jBatchWriter(config?: Partial<BatchWriterConfig>): Neo4jBatchWriter {
  if (!instance) {
    instance = new Neo4jBatchWriter(config);
  }
  return instance;
}

export default Neo4jBatchWriter;
