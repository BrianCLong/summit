import { trace, context } from '@opentelemetry/api';
import { Pool } from 'pg';
import neo4j from 'neo4j-driver';
import { Kafka, Producer } from 'kafkajs';
import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';

import { S3CSVConnector } from './connectors/S3CSVConnector';
import { HTTPConnector } from './connectors/HTTPConnector';
import { BaseConnector } from './connectors/BaseConnector';
import { logger } from './utils/logger';
import type {
  ConnectorConfig,
  IngestRecord,
  IngestJobConfig,
  ProcessingMetrics,
} from './types';

const tracer = trace.getTracer('intelgraph-ingest-orchestrator');

export class IngestOrchestrator {
  private connectors = new Map<string, BaseConnector>();
  private pgPool: Pool;
  private neo4jDriver: neo4j.Driver;
  private kafkaProducer: Producer;
  private config: IngestJobConfig;
  private isRunning = false;
  private logger = logger.child({ component: 'orchestrator' });

  constructor(config: IngestJobConfig) {
    this.config = config;

    // Initialize database connections
    this.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
    });

    this.neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USERNAME || 'neo4j',
        process.env.NEO4J_PASSWORD || 'password',
      ),
    );

    // Initialize Kafka producer
    const kafka = new Kafka({
      clientId: 'intelgraph-ingest',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });

    this.kafkaProducer = kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000,
    });

    this.initializeConnectors();
  }

  private initializeConnectors(): void {
    for (const connectorConfig of this.config.connectors) {
      let connector: BaseConnector;

      switch (connectorConfig.type) {
        case 's3csv':
          connector = new S3CSVConnector(connectorConfig);
          break;
        case 'http':
          connector = new HTTPConnector(connectorConfig);
          break;
        default:
          this.logger.warn('Unknown connector type', {
            type: connectorConfig.type,
          });
          continue;
      }

      this.connectors.set(connectorConfig.name, connector);
      this.logger.info('Initialized connector', {
        name: connectorConfig.name,
        type: connectorConfig.type,
      });
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Orchestrator already running');
      return;
    }

    const span = tracer.startSpan('ingest-orchestrator-start');

    try {
      this.logger.info('Starting IntelGraph Ingest Orchestrator');

      // Connect to Kafka
      await this.kafkaProducer.connect();

      // Verify database connections
      await this.healthCheck();

      this.isRunning = true;

      // Start processing each connector
      const promises = Array.from(this.connectors.entries()).map(
        ([name, connector]) => this.processConnector(name, connector),
      );

      await Promise.all(promises);

      span.setStatus({ code: 1 }); // OK
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }

  private async processConnector(
    name: string,
    connector: BaseConnector,
  ): Promise<void> {
    const span = tracer.startSpan('process-connector', {
      attributes: {
        'connector.name': name,
      },
    });

    try {
      this.logger.info('Starting connector processing', { connector: name });

      let batch: IngestRecord[] = [];
      let recordCount = 0;
      const startTime = Date.now();

      for await (const record of connector.ingest()) {
        batch.push(record);
        recordCount++;

        if (batch.length >= this.config.batch_size) {
          await this.processBatch(batch);
          batch = [];

          // Emit checkpoint
          if (recordCount % this.config.checkpoint_interval === 0) {
            await this.emitCheckpoint(name, recordCount);
          }
        }
      }

      // Process remaining records
      if (batch.length > 0) {
        await this.processBatch(batch);
      }

      const metrics: ProcessingMetrics = {
        records_processed: recordCount,
        records_failed: 0, // TODO: Track failures
        bytes_processed: 0, // TODO: Track bytes
        processing_duration_ms: Date.now() - startTime,
      };

      span.setAttributes({
        'ingest.records_processed': recordCount,
        'ingest.duration_ms': metrics.processing_duration_ms,
      });

      this.logger.info('Connector processing completed', {
        connector: name,
        metrics,
      });

      span.setStatus({ code: 1 }); // OK
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: (error as Error).message });
      this.logger.error('Connector processing failed', {
        connector: name,
        error: (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
    }
  }

  private async processBatch(batch: IngestRecord[]): Promise<void> {
    const span = tracer.startSpan('process-batch', {
      attributes: {
        'batch.size': batch.length,
      },
    });

    try {
      // Write to PostgreSQL staging table
      await this.writeToPostgres(batch);

      // Write to Neo4j
      await this.writeToNeo4j(batch);

      // Emit to Kafka for downstream processing
      await this.emitToKafka(batch);

      span.setStatus({ code: 1 }); // OK
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }

  private async writeToPostgres(batch: IngestRecord[]): Promise<void> {
    const client = await this.pgPool.connect();

    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO staging_entities (
          id, type, name, attributes, pii_flags, source_id,
          provenance, retention_tier, purpose, region, collected_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          attributes = EXCLUDED.attributes,
          pii_flags = EXCLUDED.pii_flags,
          collected_at = EXCLUDED.collected_at
      `;

      for (const record of batch) {
        await client.query(query, [
          record.id,
          record.type,
          record.name,
          JSON.stringify(record.attributes),
          JSON.stringify(record.pii_flags),
          record.source_id,
          JSON.stringify(record.provenance),
          record.retention_tier,
          record.purpose,
          record.region,
          new Date(),
        ]);
      }

      await client.query('COMMIT');

      this.logger.debug('Wrote batch to PostgreSQL', {
        batch_size: batch.length,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async writeToNeo4j(batch: IngestRecord[]): Promise<void> {
    const session = this.neo4jDriver.session();

    try {
      const tx = session.beginTransaction();

      // Batch create entities
      const query = `
        UNWIND $rows AS row
        MERGE (e:Entity {id: row.id})
        SET e.type = row.type,
            e.name = row.name,
            e.attributes = row.attributes,
            e.source_id = row.source_id,
            e.retention_tier = row.retention_tier,
            e.purpose = row.purpose,
            e.region = row.region,
            e.updated_at = datetime()
        WITH e, row
        MERGE (s:Source {id: row.source_id})
        SET s.provenance = row.provenance
        MERGE (e)-[:FROM_SOURCE]->(s)
      `;

      const rows = batch.map((record) => ({
        id: record.id,
        type: record.type,
        name: record.name,
        attributes: record.attributes,
        source_id: record.source_id,
        retention_tier: record.retention_tier,
        purpose: record.purpose,
        region: record.region,
        provenance: record.provenance,
      }));

      await tx.run(query, { rows });
      await tx.commit();

      this.logger.debug('Wrote batch to Neo4j', { batch_size: batch.length });
    } catch (error) {
      this.logger.error('Failed to write to Neo4j', {
        error: (error as Error).message,
      });
      throw error;
    } finally {
      await session.close();
    }
  }

  private async emitToKafka(batch: IngestRecord[]): Promise<void> {
    const messages = batch.map((record) => ({
      key: record.id,
      value: JSON.stringify(record),
      headers: {
        'content-type': 'application/json',
        'source-connector': record.source_id,
        'retention-tier': record.retention_tier,
        purpose: record.purpose,
      },
    }));

    await this.kafkaProducer.send({
      topic: 'intelgraph-entities',
      messages,
    });

    this.logger.debug('Emitted batch to Kafka', { batch_size: batch.length });
  }

  private async emitCheckpoint(
    connectorName: string,
    recordCount: number,
  ): Promise<void> {
    await this.kafkaProducer.send({
      topic: 'intelgraph-checkpoints',
      messages: [
        {
          key: connectorName,
          value: JSON.stringify({
            connector: connectorName,
            record_count: recordCount,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });

    this.logger.info('Emitted checkpoint', {
      connector: connectorName,
      record_count: recordCount,
    });
  }

  private async healthCheck(): Promise<void> {
    // Check PostgreSQL
    const pgClient = await this.pgPool.connect();
    try {
      await pgClient.query('SELECT 1');
      this.logger.info('PostgreSQL connection verified');
    } finally {
      pgClient.release();
    }

    // Check Neo4j
    const session = this.neo4jDriver.session();
    try {
      await session.run('RETURN 1');
      this.logger.info('Neo4j connection verified');
    } finally {
      await session.close();
    }

    // Check connectors
    for (const [name, connector] of this.connectors) {
      const healthy = await connector.healthCheck();
      this.logger.info('Connector health check', {
        connector: name,
        healthy,
      });

      if (!healthy) {
        throw new Error(`Connector ${name} failed health check`);
      }
    }
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping IntelGraph Ingest Orchestrator');

    this.isRunning = false;

    // Shutdown connectors
    await Promise.all(
      Array.from(this.connectors.values()).map((connector) =>
        connector.shutdown(),
      ),
    );

    // Close connections
    await this.kafkaProducer.disconnect();
    await this.pgPool.end();
    await this.neo4jDriver.close();

    this.logger.info('IntelGraph Ingest Orchestrator stopped');
  }

  /**
   * Load configuration from datasources.yaml
   */
  static async fromConfig(configPath: string): Promise<IngestOrchestrator> {
    const configFile = await fs.readFile(configPath, 'utf8');
    const config = yaml.load(configFile) as any;

    const jobConfig: IngestJobConfig = {
      connectors: config.sources,
      batch_size: config.batch_size || 100,
      max_concurrent_jobs: config.max_concurrent_jobs || 3,
      checkpoint_interval: config.checkpoint_interval || 1000,
      retry_policy: config.retry_policy || {
        max_retries: 3,
        backoff_multiplier: 2,
        max_backoff_seconds: 60,
      },
    };

    return new IngestOrchestrator(jobConfig);
  }
}
