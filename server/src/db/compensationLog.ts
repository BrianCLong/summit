/**
 * Neo4j Compensation Log System
 * Provides bulletproof rollback capabilities with audit correlation
 */

import { Driver, Session, Transaction } from 'neo4j-driver';
import { randomUUID as uuid } from 'crypto';
import logger from '../utils/logger';
import { getNeo4jDriver } from './neo4j';

export interface CompensationEntry {
  id: string;
  correlationId: string;
  operation: string;
  entityType: string;
  entityId?: string;
  compensationType:
    | 'DELETE'
    | 'CREATE'
    | 'UPDATE'
    | 'RELATIONSHIP_DELETE'
    | 'RELATIONSHIP_CREATE';
  compensationData: any;
  executedAt?: string;
  success?: boolean;
  error?: string;
}

export interface MutationContext {
  correlationId: string;
  userId: string;
  tenantId: string;
  timestamp: string;
  operation: string;
  compensators: CompensationEntry[];
}

export interface SafeTransactionResult<T> {
  result: T;
  compensationId: string;
  rollback: () => Promise<void>;
}

/**
 * Compensation function type - should undo a specific operation
 */
export type CompensationFunction = (tx: Transaction) => Promise<void>;

/**
 * Enhanced transaction manager with automatic compensation logging
 */
export class CompensationManager {
  private driver: Driver;

  constructor(driver?: Driver) {
    this.driver = driver || getNeo4jDriver();
  }

  /**
   * Execute a mutation with automatic compensation tracking
   */
  async runSafeMutation<T>(
    operation: string,
    userId: string,
    tenantId: string,
    mutationFn: (context: SafeMutationContext) => Promise<T>,
  ): Promise<SafeTransactionResult<T>> {
    const correlationId = uuid();
    const timestamp = new Date().toISOString();
    const session = this.driver.session();

    const context: MutationContext = {
      correlationId,
      userId,
      tenantId,
      timestamp,
      operation,
      compensators: [],
    };

    try {
      // Create compensation log entry
      await this.createCompensationLog(correlationId, {
        operation,
        userId,
        tenantId,
        timestamp,
        status: 'STARTED',
      });

      const result = await session.executeWrite(async (tx) => {
        const safeContext = new SafeMutationContext(tx, context, this);

        try {
          const mutationResult = await mutationFn(safeContext);

          // Log all compensators
          await this.logCompensators(correlationId, context.compensators);

          return mutationResult;
        } catch (error) {
          // Execute compensations in reverse order
          await this.executeCompensations(tx, context.compensators.reverse());
          throw error;
        }
      });

      // Mark compensation log as successful
      await this.updateCompensationLog(correlationId, { status: 'COMPLETED' });

      return {
        result,
        compensationId: correlationId,
        rollback: () => this.manualRollback(correlationId),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await this.updateCompensationLog(correlationId, {
        status: 'FAILED',
        error: errorMessage,
      });

      logger.error('Safe mutation failed', {
        correlationId,
        operation,
        userId,
        tenantId,
        error: errorMessage,
      });

      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Manual rollback using compensation log
   */
  async manualRollback(correlationId: string): Promise<void> {
    const session = this.driver.session();

    try {
      await session.executeWrite(async (tx) => {
        // Get compensation entries
        const compensators = await this.getCompensators(correlationId);

        // Execute compensations in reverse order
        await this.executeCompensations(tx, compensators.reverse());

        // Mark as rolled back
        await this.updateCompensationLog(correlationId, {
          status: 'ROLLED_BACK',
          rolledBackAt: new Date().toISOString(),
        });
      });

      logger.info('Manual rollback completed', { correlationId });
    } catch (error) {
      logger.error('Manual rollback failed', {
        correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Create main compensation log entry
   */
  private async createCompensationLog(
    correlationId: string,
    data: any,
  ): Promise<void> {
    const session = this.driver.session();

    try {
      await session.run(
        `
        CREATE (log:CompensationLog {
          id: $correlationId,
          operation: $operation,
          userId: $userId,
          tenantId: $tenantId,
          timestamp: datetime($timestamp),
          status: $status,
          createdAt: datetime()
        })
      `,
        { correlationId, ...data },
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Update compensation log status
   */
  private async updateCompensationLog(
    correlationId: string,
    updates: any,
  ): Promise<void> {
    const session = this.driver.session();

    try {
      const setClause = Object.keys(updates)
        .map((key) => `log.${key} = $${key}`)
        .join(', ');

      await session.run(
        `
        MATCH (log:CompensationLog {id: $correlationId})
        SET ${setClause}, log.updatedAt = datetime()
      `,
        { correlationId, ...updates },
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Log individual compensators
   */
  private async logCompensators(
    correlationId: string,
    compensators: CompensationEntry[],
  ): Promise<void> {
    if (compensators.length === 0) return;

    const session = this.driver.session();

    try {
      await session.run(
        `
        MATCH (log:CompensationLog {id: $correlationId})
        UNWIND $compensators AS comp
        CREATE (log)-[:HAS_COMPENSATOR]->(c:Compensator {
          id: comp.id,
          operation: comp.operation,
          entityType: comp.entityType,
          entityId: comp.entityId,
          compensationType: comp.compensationType,
          compensationData: comp.compensationData,
          createdAt: datetime()
        })
      `,
        {
          correlationId,
          compensators: compensators.map((c) => ({
            ...c,
            compensationData: JSON.stringify(c.compensationData),
          })),
        },
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Get compensators for a correlation ID
   */
  private async getCompensators(
    correlationId: string,
  ): Promise<CompensationEntry[]> {
    const session = this.driver.session();

    try {
      const result = await session.run(
        `
        MATCH (log:CompensationLog {id: $correlationId})-[:HAS_COMPENSATOR]->(c:Compensator)
        RETURN c
        ORDER BY c.createdAt ASC
      `,
        { correlationId },
      );

      return result.records.map((record) => {
        const comp = record.get('c').properties;
        return {
          id: comp.id,
          correlationId,
          operation: comp.operation,
          entityType: comp.entityType,
          entityId: comp.entityId,
          compensationType: comp.compensationType,
          compensationData: JSON.parse(comp.compensationData),
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Execute compensation functions
   */
  private async executeCompensations(
    tx: Transaction,
    compensators: CompensationEntry[],
  ): Promise<void> {
    for (const comp of compensators) {
      try {
        await this.executeCompensation(tx, comp);

        // Mark as executed
        comp.executedAt = new Date().toISOString();
        comp.success = true;

        logger.debug('Compensation executed successfully', {
          compensationId: comp.id,
          type: comp.compensationType,
          entityType: comp.entityType,
          entityId: comp.entityId,
        });
      } catch (error) {
        comp.success = false;
        comp.error = error instanceof Error ? error.message : String(error);

        logger.error('Compensation execution failed', {
          compensationId: comp.id,
          type: comp.compensationType,
          error: comp.error,
        });

        // Continue with other compensations even if one fails
      }
    }
  }

  /**
   * Execute individual compensation
   */
  private async executeCompensation(
    tx: Transaction,
    comp: CompensationEntry,
  ): Promise<void> {
    const { compensationType, entityType, entityId, compensationData } = comp;

    switch (compensationType) {
      case 'DELETE':
        await tx.run(
          `
          MATCH (n:${entityType} {id: $entityId})
          DELETE n
        `,
          { entityId },
        );
        break;

      case 'CREATE':
        const labels = compensationData.labels || [entityType];
        const labelsStr = labels.map((l: string) => `:${l}`).join('');

        await tx.run(
          `
          CREATE (n${labelsStr})
          SET n = $properties
        `,
          { properties: compensationData.properties },
        );
        break;

      case 'UPDATE':
        await tx.run(
          `
          MATCH (n:${entityType} {id: $entityId})
          SET n = $originalProperties
        `,
          {
            entityId,
            originalProperties: compensationData.originalProperties,
          },
        );
        break;

      case 'RELATIONSHIP_DELETE':
        await tx.run(
          `
          MATCH ()-[r:${compensationData.type} {id: $relationshipId}]->()
          DELETE r
        `,
          { relationshipId: compensationData.relationshipId },
        );
        break;

      case 'RELATIONSHIP_CREATE':
        await tx.run(
          `
          MATCH (from {id: $fromId}), (to {id: $toId})
          CREATE (from)-[r:${compensationData.type}]->(to)
          SET r = $properties
        `,
          {
            fromId: compensationData.fromId,
            toId: compensationData.toId,
            properties: compensationData.properties,
          },
        );
        break;

      default:
        throw new Error(`Unknown compensation type: ${compensationType}`);
    }
  }

  /**
   * Get compensation history for audit purposes
   */
  async getCompensationHistory(
    filters: {
      tenantId?: string;
      userId?: string;
      operation?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
    } = {},
    limit: number = 100,
  ): Promise<any[]> {
    const session = this.driver.session();

    try {
      let whereClause = 'WHERE true';
      const params: any = { limit };

      if (filters.tenantId) {
        whereClause += ' AND log.tenantId = $tenantId';
        params.tenantId = filters.tenantId;
      }

      if (filters.userId) {
        whereClause += ' AND log.userId = $userId';
        params.userId = filters.userId;
      }

      if (filters.operation) {
        whereClause += ' AND log.operation = $operation';
        params.operation = filters.operation;
      }

      if (filters.status) {
        whereClause += ' AND log.status = $status';
        params.status = filters.status;
      }

      if (filters.fromDate) {
        whereClause += ' AND log.timestamp >= datetime($fromDate)';
        params.fromDate = filters.fromDate;
      }

      if (filters.toDate) {
        whereClause += ' AND log.timestamp <= datetime($toDate)';
        params.toDate = filters.toDate;
      }

      const result = await session.run(
        `
        MATCH (log:CompensationLog)
        ${whereClause}
        OPTIONAL MATCH (log)-[:HAS_COMPENSATOR]->(c:Compensator)
        RETURN log, collect(c) as compensators
        ORDER BY log.timestamp DESC
        LIMIT $limit
      `,
        params,
      );

      return result.records.map((record) => ({
        ...record.get('log').properties,
        compensators: record.get('compensators').map((c: any) => c.properties),
      }));
    } finally {
      await session.close();
    }
  }
}

/**
 * Safe mutation context with compensation registration
 */
export class SafeMutationContext {
  constructor(
    public tx: Transaction,
    public context: MutationContext,
    private manager: CompensationManager,
  ) {}

  /**
   * Register a compensation for entity creation
   */
  compensateEntityCreation(entityType: string, entityId: string): void {
    this.context.compensators.push({
      id: uuid(),
      correlationId: this.context.correlationId,
      operation: this.context.operation,
      entityType,
      entityId,
      compensationType: 'DELETE',
      compensationData: { entityId },
    });
  }

  /**
   * Register a compensation for entity update
   */
  compensateEntityUpdate(
    entityType: string,
    entityId: string,
    originalProperties: any,
  ): void {
    this.context.compensators.push({
      id: uuid(),
      correlationId: this.context.correlationId,
      operation: this.context.operation,
      entityType,
      entityId,
      compensationType: 'UPDATE',
      compensationData: { originalProperties },
    });
  }

  /**
   * Register a compensation for entity deletion
   */
  compensateEntityDeletion(
    entityType: string,
    entityProperties: any,
    labels: string[],
  ): void {
    this.context.compensators.push({
      id: uuid(),
      correlationId: this.context.correlationId,
      operation: this.context.operation,
      entityType,
      compensationType: 'CREATE',
      compensationData: {
        properties: entityProperties,
        labels,
      },
    });
  }

  /**
   * Register a compensation for relationship creation
   */
  compensateRelationshipCreation(
    relationshipType: string,
    relationshipId: string,
  ): void {
    this.context.compensators.push({
      id: uuid(),
      correlationId: this.context.correlationId,
      operation: this.context.operation,
      entityType: 'Relationship',
      compensationType: 'RELATIONSHIP_DELETE',
      compensationData: {
        type: relationshipType,
        relationshipId,
      },
    });
  }

  /**
   * Register a compensation for relationship deletion
   */
  compensateRelationshipDeletion(
    relationshipType: string,
    fromId: string,
    toId: string,
    properties: any,
  ): void {
    this.context.compensators.push({
      id: uuid(),
      correlationId: this.context.correlationId,
      operation: this.context.operation,
      entityType: 'Relationship',
      compensationType: 'RELATIONSHIP_CREATE',
      compensationData: {
        type: relationshipType,
        fromId,
        toId,
        properties,
      },
    });
  }

  /**
   * Execute raw Cypher with automatic compensation tracking
   */
  async runWithCompensation<T>(
    query: string,
    parameters: any,
    compensationFn: () => void,
  ): Promise<T> {
    const result = await this.tx.run(query, parameters);
    compensationFn();
    return result as T;
  }
}

/**
 * Global compensation manager instance
 */
let globalCompensationManager: CompensationManager | null = null;

export function getCompensationManager(): CompensationManager {
  if (!globalCompensationManager) {
    globalCompensationManager = new CompensationManager();
  }
  return globalCompensationManager;
}
