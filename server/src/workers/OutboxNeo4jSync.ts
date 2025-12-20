/**
 * Outbox Neo4j Sync Worker
 * Handles eventual consistency between PostgreSQL and Neo4j
 * Processes outbox events with retry logic and idempotent operations
 */

import { Pool } from 'pg';
import type { Driver } from 'neo4j-driver';
import type { Logger } from '../shared/logging/Logger.js';
import logger from '../utils/logger.js';

const workerLogger: Logger = logger.child({ name: 'OutboxNeo4jSync' });

interface OutboxEvent {
  id: string;
  topic: string;
  payload: any;
  created_at: Date;
  attempts: number;
  last_error?: string;
}

/**
 * Worker responsible for synchronizing data from the PostgreSQL Outbox table to Neo4j.
 * This ensures eventual consistency between the relational and graph databases.
 * It supports batching, retries, and backoff strategies.
 */
export class OutboxNeo4jSync {
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  /**
   * Initializes the OutboxNeo4jSync worker.
   *
   * @param pg - PostgreSQL connection pool.
   * @param neo4j - Neo4j driver instance.
   * @param config - Configuration options for the worker.
   * @param config.batchSize - Number of events to process in a single batch (default: 100).
   * @param config.intervalMs - Polling interval in milliseconds (default: 2000).
   * @param config.maxRetries - Maximum number of retry attempts for failed events (default: 10).
   * @param config.backoffMultiplier - Multiplier for exponential backoff (default: 2).
   */
  constructor(
    private pg: Pool,
    private neo4j: Driver,
    private config: {
      batchSize?: number;
      intervalMs?: number;
      maxRetries?: number;
      backoffMultiplier?: number;
    } = {},
  ) {
    this.config = {
      batchSize: 100,
      intervalMs: 2000,
      maxRetries: 10,
      backoffMultiplier: 2,
      ...config,
    };
  }

  /**
   * Starts the outbox processing worker.
   * It sets up a periodic interval to process batches of events.
   */
  start(): void {
    if (this.isRunning) {
      workerLogger.warn('Outbox worker already running');
      return;
    }

    this.isRunning = true;
    workerLogger.info('Starting outbox worker', { config: this.config });

    this.intervalId = setInterval(() => {
      this.processOutboxBatch().catch((error) => {
        workerLogger.error({ error }, 'Outbox batch processing failed');
      });
    }, this.config.intervalMs);
  }

  /**
   * Stops the outbox processing worker.
   * Clears the processing interval.
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    workerLogger.info('Stopped outbox worker');
  }

  /**
   * Processes a single batch of outbox events.
   * Fetches unprocessed events from the database, locking them for processing.
   */
  async processOutboxBatch(): Promise<void> {
    const client = await this.pg.connect();

    try {
      // Get unprocessed events with advisory lock to prevent concurrent processing
      const { rows } = await client.query(
        `SELECT id, topic, payload, created_at, attempts, last_error
         FROM outbox_events 
         WHERE processed_at IS NULL 
         AND attempts < $1
         ORDER BY created_at ASC 
         LIMIT $2
         FOR UPDATE SKIP LOCKED`,
        [this.config.maxRetries, this.config.batchSize],
      );

      if ((rows as any[]).length === 0) {
        return;
      }

      workerLogger.debug(`Processing ${(rows as any[]).length} outbox events`);

      // Process each event
      for (const event of rows as any[]) {
        await this.processEvent(client, event as OutboxEvent);
      }
    } finally {
      client.release();
    }
  }

  /**
   * Processes a single outbox event by delegating to the appropriate handler based on topic.
   * Updates the event status in the database upon success or failure.
   *
   * @param client - The database client.
   * @param event - The outbox event to process.
   */
  private async processEvent(client: any, event: OutboxEvent): Promise<void> {
    const eventLogger = workerLogger.child({
      eventId: event.id,
      topic: event.topic,
      attempts: event.attempts,
    });

    try {
      eventLogger.debug('Processing outbox event');

      // Handle different event types
      switch (event.topic) {
        case 'entity.upsert':
          await this.handleEntityUpsert(event.payload);
          break;

        case 'entity.delete':
          await this.handleEntityDelete(event.payload);
          break;

        case 'relationship.upsert':
          await this.handleRelationshipUpsert(event.payload);
          break;

        case 'relationship.delete':
          await this.handleRelationshipDelete(event.payload);
          break;

        default:
          eventLogger.warn(`Unknown event topic: ${event.topic}`);
          // Mark as processed to avoid retry loop
          await client.query(
            `UPDATE outbox_events SET processed_at = now() WHERE id = $1`,
            [event.id],
          );
          return;
      }

      // Mark as successfully processed
      await client.query(
        `UPDATE outbox_events SET processed_at = now() WHERE id = $1`,
        [event.id],
      );

      eventLogger.debug('Event processed successfully');
    } catch (error: any) {
      const newAttempts = event.attempts + 1;
      const errorMessage = error.message || String(error);

      eventLogger.error({ error, newAttempts }, 'Event processing failed');

      // Update attempt count and error
      await client.query(
        `UPDATE outbox_events 
         SET attempts = $2, last_error = $3 
         WHERE id = $1`,
        [event.id, newAttempts, errorMessage],
      );

      // If max retries reached, log and continue (could implement DLQ here)
      if (newAttempts >= this.config.maxRetries!) {
        eventLogger.error(
          { maxRetries: this.config.maxRetries },
          'Event exceeded max retries, will not retry again',
        );
      }
    }
  }

  /**
   * Handles 'entity.upsert' events.
   * Fetches the latest entity data from PG and updates/creates the corresponding node in Neo4j.
   *
   * @param payload - The event payload containing the entity ID.
   */
  private async handleEntityUpsert(payload: any): Promise<void> {
    const { id, tenantId } = payload;

    // Fetch fresh entity data from PostgreSQL
    const { rows } = await this.pg.query(
      `SELECT id, tenant_id, kind, labels, props FROM entities WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      workerLogger.warn(
        { entityId: id },
        'Entity not found for upsert, may have been deleted',
      );
      return;
    }

    const entity = rows[0];
    const session = this.neo4j.session();

    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MERGE (e:Entity {id: $id})
           ON CREATE SET e.createdAt = timestamp()
           SET e.tenantId = $tenantId,
               e.kind = $kind,
               e.labels = $labels,
               e.props = $props,
               e.updatedAt = timestamp()`,
          {
            id: entity.id,
            tenantId: entity.tenant_id,
            kind: entity.kind,
            labels: entity.labels,
            props: entity.props,
          },
        );
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Handles 'entity.delete' events.
   * Removes the corresponding node from Neo4j.
   *
   * @param payload - The event payload containing the entity ID.
   */
  private async handleEntityDelete(payload: any): Promise<void> {
    const { id } = payload;
    const session = this.neo4j.session();

    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MATCH (e:Entity {id: $id})
           DETACH DELETE e`,
          { id },
        );
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Handles 'relationship.upsert' events.
   * Fetches relationship data from PG and updates/creates the relationship in Neo4j.
   * Ensures source and destination nodes exist before creating the relationship.
   *
   * @param payload - The event payload containing the relationship ID.
   */
  private async handleRelationshipUpsert(payload: any): Promise<void> {
    const { id, tenantId } = payload;

    // Fetch fresh relationship data from PostgreSQL
    const { rows } = await this.pg.query(
      `SELECT id, tenant_id, src_id, dst_id, type, props FROM relationships WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      workerLogger.warn(
        { relationshipId: id },
        'Relationship not found for upsert, may have been deleted',
      );
      return;
    }

    const rel = rows[0];
    const session = this.neo4j.session();

    try {
      await session.executeWrite(async (tx) => {
        // First ensure both entities exist in Neo4j
        await tx.run(
          `MERGE (src:Entity {id: $srcId})
           MERGE (dst:Entity {id: $dstId})`,
          { srcId: rel.src_id, dstId: rel.dst_id },
        );

        // Then create/update the relationship
        await tx.run(
          `MATCH (src:Entity {id: $srcId}), (dst:Entity {id: $dstId})
           MERGE (src)-[r:REL {id: $id}]->(dst)
           ON CREATE SET r.createdAt = timestamp()
           SET r.tenantId = $tenantId,
               r.type = $type,
               r.props = $props,
               r.updatedAt = timestamp()`,
          {
            id: rel.id,
            srcId: rel.src_id,
            dstId: rel.dst_id,
            tenantId: rel.tenant_id,
            type: rel.type,
            props: rel.props,
          },
        );
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Handles 'relationship.delete' events.
   * Removes the relationship from Neo4j.
   *
   * @param payload - The event payload containing the relationship ID.
   */
  private async handleRelationshipDelete(payload: any): Promise<void> {
    const { id } = payload;
    const session = this.neo4j.session();

    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MATCH ()-[r:REL {id: $id}]-()
           DELETE r`,
          { id },
        );
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Retrieves statistics about the outbox queue.
   *
   * @returns An object containing pending, failed, and processed counts.
   */
  async getStats(): Promise<{
    pending: number;
    failed: number;
    processed: number;
  }> {
    const { rows } = await this.pg.query(
      `SELECT 
         COUNT(*) FILTER (WHERE processed_at IS NULL AND attempts < $1) as pending,
         COUNT(*) FILTER (WHERE processed_at IS NULL AND attempts >= $1) as failed,
         COUNT(*) FILTER (WHERE processed_at IS NOT NULL) as processed
       FROM outbox_events`,
      [this.config.maxRetries],
    );

    return {
      pending: parseInt(rows[0]?.pending || '0'),
      failed: parseInt(rows[0]?.failed || '0'),
      processed: parseInt(rows[0]?.processed || '0'),
    };
  }

  /**
   * Cleans up processed events older than a specified number of days.
   *
   * @param olderThanDays - The age threshold in days (default: 7).
   * @returns The number of deleted rows.
   */
  async cleanup(olderThanDays = 7): Promise<number> {
    const { rowCount } = await this.pg.query(
      `DELETE FROM outbox_events 
       WHERE processed_at IS NOT NULL 
       AND processed_at < now() - interval '${olderThanDays} days'`,
    );

    const deletedCount = rowCount || 0;
    if (deletedCount > 0) {
      workerLogger.info(
        { deletedCount, olderThanDays },
        'Cleaned up old outbox events',
      );
    }

    return deletedCount;
  }
}
