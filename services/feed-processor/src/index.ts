/**
 * Feed Processor Service
 * Data ingestion worker with OpenLineage integration and license enforcement
 */

import Queue from 'bull';
import Redis from 'ioredis';
import neo4j from 'neo4j-driver';
import { Pool } from 'pg';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import {
  OfflineQueueManager,
  OfflineQueuedError,
  IngestionMetadataRepository,
  type OfflineIngestionPayload,
  defaultConnectivityCheck
} from './offlineQueue';

const NODE_ENV = process.env.NODE_ENV || 'development';

// Logger
const logger = pino({
  level: NODE_ENV === 'development' ? 'debug' : 'info',
  ...(NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {})
});

const tracer = trace.getTracer('feed-processor');

// Connections
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const neo4jDriver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'test'
  )
);
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres'
});

// Queues
const ingestionQueue = new Queue('data-ingestion', process.env.REDIS_URL || 'redis://localhost:6379');
const transformQueue = new Queue('data-transform', process.env.REDIS_URL || 'redis://localhost:6379');

// Schemas
const IngestionJobSchema = z.object({
  job_id: z.string(),
  source_type: z.enum(['csv', 'json', 'elasticsearch', 'esri', 'api']),
  source_config: z.record(z.any()),
  data_source_id: z.string(),
  target_graph: z.string().default('main'),
  transform_rules: z.array(z.record(z.any())).optional(),
  authority_id: z.string(),
  reason_for_access: z.string()
});

const LineageEventSchema = z.object({
  eventType: z.enum(['START', 'COMPLETE', 'FAIL', 'ABORT']),
  eventTime: z.string().datetime(),
  run: z.object({
    runId: z.string(),
    facets: z.record(z.any()).optional()
  }),
  job: z.object({
    namespace: z.string(),
    name: z.string(),
    facets: z.record(z.any()).optional()
  }),
  inputs: z.array(z.object({
    namespace: z.string(),
    name: z.string(),
    facets: z.record(z.any()).optional()
  })).optional(),
  outputs: z.array(z.object({
    namespace: z.string(),
    name: z.string(),
    facets: z.record(z.any()).optional()
  })).optional(),
  producer: z.string()
});

type IngestionJob = z.infer<typeof IngestionJobSchema>;
type LineageEvent = z.infer<typeof LineageEventSchema>;

// OpenLineage client
class OpenLineageClient {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.OPENLINEAGE_URL || 'http://localhost:5000') {
    this.baseUrl = baseUrl;
  }

  async emitEvent(event: LineageEvent): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/lineage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`OpenLineage emit failed: ${response.status}`);
      }

      logger.info('OpenLineage event emitted', {
        eventType: event.eventType,
        job: event.job.name,
        runId: event.run.runId
      });

    } catch (error) {
      logger.error('Failed to emit OpenLineage event', error);
      // Don't fail the job if lineage emission fails
    }
  }

  createRunEvent(
    eventType: LineageEvent['eventType'],
    jobName: string,
    runId: string,
    inputs?: any[],
    outputs?: any[]
  ): LineageEvent {
    return {
      eventType,
      eventTime: new Date().toISOString(),
      run: {
        runId,
        facets: {}
      },
      job: {
        namespace: 'intelgraph',
        name: jobName,
        facets: {}
      },
      inputs: inputs?.map(input => ({
        namespace: 'intelgraph',
        name: input.name,
        facets: {
          schema: input.schema,
          dataSource: {
            name: input.source_name,
            uri: input.source_uri
          }
        }
      })),
      outputs: outputs?.map(output => ({
        namespace: 'intelgraph',
        name: output.name,
        facets: {
          schema: output.schema,
          dataQuality: output.quality_metrics
        }
      })),
      producer: 'intelgraph-feed-processor'
    };
  }
}

const lineageClient = new OpenLineageClient();

// License enforcement client
class LicenseEnforcer {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.LICENSE_REGISTRY_URL || 'http://localhost:4030') {
    this.baseUrl = baseUrl;
  }

  async checkCompliance(
    operation: string,
    dataSourceIds: string[],
    purpose: string,
    authorityId: string,
    reasonForAccess: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/compliance/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Authority-ID': authorityId,
          'X-Reason-For-Access': reasonForAccess
        },
        body: JSON.stringify({
          operation,
          data_source_ids: dataSourceIds,
          purpose
        })
      });

      if (!response.ok) {
        logger.error('License check failed', { status: response.status });
        return { allowed: false, reason: 'License validation service unavailable' };
      }

      const result = await response.json();

      return {
        allowed: result.compliance_status === 'allow',
        reason: result.human_readable_reason
      };

    } catch (error) {
      logger.error('License enforcement error', error);
      return { allowed: false, reason: 'License validation failed' };
    }
  }
}

const licenseEnforcer = new LicenseEnforcer();

// Data connectors
const connectors = {
  csv: async (config: any): Promise<any[]> => {
    // Mock CSV connector
    logger.info('Processing CSV data', config);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return [
      { id: '1', name: 'Entity A', type: 'person', source: 'csv' },
      { id: '2', name: 'Entity B', type: 'organization', source: 'csv' }
    ];
  },

  elasticsearch: async (config: any): Promise<any[]> => {
    // Mock Elasticsearch connector
    logger.info('Querying Elasticsearch', config);
    await new Promise(resolve => setTimeout(resolve, 2000));
    return [
      { id: '1', message: 'Security alert', severity: 'high', timestamp: new Date().toISOString() },
      { id: '2', message: 'System error', severity: 'medium', timestamp: new Date().toISOString() }
    ];
  },

  esri: async (config: any): Promise<any[]> => {
    // Mock ESRI ArcGIS connector
    logger.info('Fetching ESRI data', config);
    await new Promise(resolve => setTimeout(resolve, 1500));
    return [
      { id: '1', location: { lat: 40.7128, lon: -74.0060 }, properties: { name: 'NYC' } },
      { id: '2', location: { lat: 34.0522, lon: -118.2437 }, properties: { name: 'LA' } }
    ];
  },

  api: async (config: any): Promise<any[]> => {
    // Mock API connector
    logger.info('Calling external API', config);
    await new Promise(resolve => setTimeout(resolve, 800));
    return [
      { id: '1', data: 'Sample API data', status: 'active' },
      { id: '2', data: 'More API data', status: 'inactive' }
    ];
  }
};

// Graph storage with retry + telemetry
class GraphStorage {
  private async executeWithRetry<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
    return tracer.startActiveSpan(operationName, async span => {
      let attempt = 0;
      let delayMs = 200;

      try {
        while (attempt < 3) {
          try {
            const result = await operation();
            span.setAttribute('retry.attempts', attempt);
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
          } catch (error) {
            span.addEvent('retry.failure', { 'retry.attempt': attempt });
            if (attempt >= 2) {
              span.recordException(error as Error);
              span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
              throw error;
            }
            await new Promise(resolve => setTimeout(resolve, delayMs));
            delayMs *= 2;
            attempt += 1;
          }
        }

        span.setStatus({ code: SpanStatusCode.ERROR, message: 'retry_exhausted' });
        throw new Error('retry_exhausted');
      } finally {
        span.end();
      }
    });
  }

  async storeEntities(entities: any[], jobId: string): Promise<void> {
    if (entities.length === 0) {
      return;
    }

    await this.executeWithRetry('neo4j.storeEntities', async () => {
      const session = neo4jDriver.session();

      try {
        await session.executeWrite(async tx => {
          for (const entity of entities) {
            await tx.run(
              `MERGE (n:Entity {id: $id})
               SET n += $properties, n.ingestion_job = $jobId, n.updated_at = datetime()`,
              {
                id: entity.id,
                properties: entity,
                jobId
              }
            );
          }
        });

        logger.info('Stored entities in graph', {
          count: entities.length,
          jobId
        });
      } finally {
        await session.close();
      }
    });
  }

  async createRelationships(relationships: any[], jobId: string): Promise<void> {
    if (relationships.length === 0) {
      return;
    }

    await this.executeWithRetry('neo4j.createRelationships', async () => {
      const session = neo4jDriver.session();

      try {
        await session.executeWrite(async tx => {
          for (const rel of relationships) {
            await tx.run(
              `MATCH (a:Entity {id: $sourceId}), (b:Entity {id: $targetId})
               MERGE (a)-[r:${rel.type}]->(b)
               SET r += $properties, r.ingestion_job = $jobId, r.created_at = datetime()`,
              {
                sourceId: rel.source,
                targetId: rel.target,
                properties: rel.properties || {},
                jobId
              }
            );
          }
        });

        logger.info('Created relationships in graph', {
          count: relationships.length,
          jobId
        });
      } finally {
        await session.close();
      }
    });
  }
}

const graphStorage = new GraphStorage();

type IngestionContext = Pick<IngestionJob, 'job_id' | 'data_source_id' | 'source_type' | 'target_graph'>;

class DataSyncService {
  constructor(
    private readonly graph: GraphStorage,
    private readonly metadata: IngestionMetadataRepository,
    private readonly offlineQueue: OfflineQueueManager,
    private readonly log: pino.Logger
  ) {}

  async persist(
    context: IngestionContext,
    entities: any[],
    relationships: any[] = [],
    runId?: string,
    extraMetadata: Record<string, any> = {}
  ): Promise<void> {
    return tracer.startActiveSpan('datasync.persist', async span => {
      span.setAttribute('ingestion.job_id', context.job_id);
      span.setAttribute('ingestion.records', entities.length);

      try {
        await this.graph.storeEntities(entities, context.job_id);
        await this.graph.createRelationships(relationships, context.job_id);

        await this.metadata.recordRun({
          jobId: context.job_id,
          status: 'complete',
          processed: entities.length,
          failed: 0,
          runId,
          metadata: {
            ...extraMetadata,
            data_source_id: context.data_source_id,
            source_type: context.source_type,
            target_graph: context.target_graph,
            offline: false
          },
          completed: true
        });

        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        if (OfflineQueueManager.isConnectivityError(error)) {
          const payload: OfflineIngestionPayload = {
            job: {
              job_id: context.job_id,
              data_source_id: context.data_source_id,
              source_type: context.source_type,
              target_graph: context.target_graph
            },
            runId,
            entities,
            relationships,
            metrics: {
              recordsProcessed: entities.length,
              relationshipsCreated: relationships.length
            },
            metadata: extraMetadata,
            queuedAt: new Date().toISOString(),
            attempts: 0
          };

          await this.offlineQueue.enqueue(payload, error as Error);
          span.addEvent('offline.queued');
          span.setStatus({ code: SpanStatusCode.ERROR, message: 'queued_offline' });

          try {
            await this.metadata.recordRun({
              jobId: context.job_id,
              status: 'queued_offline',
              processed: entities.length,
              failed: 0,
              runId,
              metadata: {
                ...extraMetadata,
                data_source_id: context.data_source_id,
                source_type: context.source_type,
                target_graph: context.target_graph,
                offline: true,
                queuedAt: payload.queuedAt
              },
              completed: false
            });
          } catch (recordError) {
            this.log.debug('Unable to record offline queue status', {
              jobId: context.job_id,
              error: (recordError as Error).message
            });
          }

          throw new OfflineQueuedError('Queued for offline sync', payload, error as Error);
        }

        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

const metadataRepository = new IngestionMetadataRepository(pgPool, logger);

const offlineQueue = new OfflineQueueManager(
  redis,
  async (payload: OfflineIngestionPayload) => {
    await graphStorage.storeEntities(payload.entities, payload.job.job_id);
    await graphStorage.createRelationships(payload.relationships ?? [], payload.job.job_id);

    const syncedAt = new Date().toISOString();
    await metadataRepository.recordRun({
      jobId: payload.job.job_id,
      status: 'synced_offline',
      processed: payload.metrics.recordsProcessed,
      failed: 0,
      runId: payload.runId,
      metadata: {
        ...(payload.metadata || {}),
        data_source_id: payload.job.data_source_id,
        source_type: payload.job.source_type,
        target_graph: payload.job.target_graph,
        offline: true,
        queuedAt: payload.queuedAt,
        syncedAt,
        relationshipsCreated: payload.metrics.relationshipsCreated ?? 0
      },
      completed: true
    });
  },
  async () => defaultConnectivityCheck(pgPool, neo4jDriver, logger),
  logger,
  {
    flushIntervalMs: process.env.OFFLINE_FLUSH_INTERVAL_MS
      ? Number(process.env.OFFLINE_FLUSH_INTERVAL_MS)
      : undefined,
    batchSize: process.env.OFFLINE_FLUSH_BATCH_SIZE
      ? Number(process.env.OFFLINE_FLUSH_BATCH_SIZE)
      : undefined
  }
);

const dataSyncService = new DataSyncService(graphStorage, metadataRepository, offlineQueue, logger);

offlineQueue.start();
offlineQueue.flush().catch(error => {
  logger.warn('Initial offline queue flush failed', { error: (error as Error).message });
});

// Job processors
ingestionQueue.process('ingest-data', 5, async job =>
  tracer.startActiveSpan('queue.ingest-data', async span => {
    const jobData = IngestionJobSchema.parse(job.data);
    const context: IngestionContext = {
      job_id: jobData.job_id,
      data_source_id: jobData.data_source_id,
      source_type: jobData.source_type,
      target_graph: jobData.target_graph
    };

    span.setAttribute('ingestion.job_id', context.job_id);
    span.setAttribute('ingestion.source_type', context.source_type);

    const runId = uuidv4();
    let rawData: any[] = [];

    try {
      await lineageClient.emitEvent(
        lineageClient.createRunEvent('START', `ingest-${jobData.source_type}`, runId, [
          {
            name: jobData.data_source_id,
            source_name: jobData.source_type,
            source_uri: JSON.stringify(jobData.source_config),
            schema: { type: 'unknown' }
          }
        ])
      );

      const compliance = await licenseEnforcer.checkCompliance(
        'ingest',
        [jobData.data_source_id],
        'data-ingestion',
        jobData.authority_id,
        jobData.reason_for_access
      );

      if (!compliance.allowed) {
        throw new Error(`License compliance violation: ${compliance.reason}`);
      }

      const connector = connectors[jobData.source_type];
      if (!connector) {
        throw new Error(`Unknown source type: ${jobData.source_type}`);
      }

      rawData = await connector(jobData.source_config);

      let transformedData = rawData;
      if (jobData.transform_rules && jobData.transform_rules.length > 0) {
        await transformQueue.add(
          'transform-data',
          {
            job_id: jobData.job_id,
            raw_data: rawData,
            transform_rules: jobData.transform_rules,
            run_id: runId,
            job_meta: context
          },
          {
            attempts: 5,
            backoff: { type: 'exponential', delay: 2000 }
          }
        );
      } else {
        await dataSyncService.persist(context, transformedData, [], runId, { stage: 'ingest' });
      }

      await lineageClient.emitEvent(
        lineageClient.createRunEvent('COMPLETE', `ingest-${jobData.source_type}`, runId, [
          {
            name: jobData.data_source_id,
            source_name: jobData.source_type,
            source_uri: JSON.stringify(jobData.source_config),
            schema: { type: 'unknown' }
          }
        ], [
          {
            name: `${jobData.target_graph}-entities`,
            schema: { entities: transformedData.length },
            quality_metrics: {
              completeness: 1.0,
              validity: 1.0,
              uniqueness: 1.0
            }
          }
        ])
      );

      logger.info('Ingestion job completed', {
        jobId: jobData.job_id,
        recordsProcessed: rawData.length,
        runId
      });

      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      if (error instanceof OfflineQueuedError) {
        await lineageClient.emitEvent(
          lineageClient.createRunEvent('ABORT', `ingest-${jobData.source_type}`, runId)
        );
        logger.warn('Ingestion job queued for offline sync', {
          jobId: jobData.job_id,
          runId
        });
        span.addEvent('offline.queued.ingest');
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'queued_offline' });
        return;
      }

      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });

      logger.error('Ingestion job failed', {
        jobId: jobData.job_id,
        error: (error as Error).message,
        runId
      });

      await lineageClient.emitEvent(
        lineageClient.createRunEvent('FAIL', `ingest-${jobData.source_type}`, runId)
      );

      try {
        await metadataRepository.recordRun({
          jobId: jobData.job_id,
          status: 'failed',
          processed: rawData.length,
          failed: rawData.length,
          runId,
          error: (error as Error).message,
          metadata: {
            data_source_id: jobData.data_source_id,
            source_type: jobData.source_type,
            target_graph: jobData.target_graph,
            offline: false,
            stage: 'ingest'
          },
          completed: false
        });
      } catch (recordError) {
        logger.error('Failed to record ingestion failure', {
          jobId: jobData.job_id,
          error: (recordError as Error).message
        });
      }

      throw error;
    } finally {
      span.end();
    }
  })
);

transformQueue.process('transform-data', 3, async job =>
  tracer.startActiveSpan('queue.transform-data', async span => {
    const { job_id, raw_data, transform_rules, run_id, job_meta } = job.data as {
      job_id: string;
      raw_data: any[];
      transform_rules: any[];
      run_id?: string;
      job_meta?: IngestionContext;
    };

    const context: IngestionContext = {
      job_id,
      data_source_id: job_meta?.data_source_id ?? 'unknown',
      source_type: job_meta?.source_type ?? 'transform',
      target_graph: job_meta?.target_graph ?? 'main'
    };

    span.setAttribute('ingestion.job_id', job_id);
    span.setAttribute('ingestion.stage', 'transform');

    try {
      logger.info('Starting data transformation', { jobId: job_id, runId: run_id });

      let transformedData = raw_data;

      for (const rule of transform_rules) {
        switch (rule.type) {
          case 'entity_extraction':
            transformedData = transformedData.map((record: any) => ({
              ...record,
              entity_type: rule.entity_type || 'unknown',
              extracted_at: new Date().toISOString()
            }));
            break;

          case 'field_mapping':
            transformedData = transformedData.map((record: any) => {
              const mapped: any = {};
              for (const [sourceField, targetField] of Object.entries(rule.mapping)) {
                mapped[targetField as string] = record[sourceField];
              }
              return { ...record, ...mapped };
            });
            break;

          case 'data_enrichment':
            transformedData = transformedData.map((record: any) => ({
              ...record,
              enriched: true,
              confidence: 0.95
            }));
            break;
        }
      }

      const relationships = extractRelationships(transformedData);

      await dataSyncService.persist(context, transformedData, relationships, run_id, {
        stage: 'transform'
      });

      logger.info('Transformation completed', {
        jobId: job_id,
        inputRecords: raw_data.length,
        outputRecords: transformedData.length,
        relationships: relationships.length
      });

      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      if (error instanceof OfflineQueuedError) {
        logger.warn('Transformation job queued for offline sync', {
          jobId: job_id,
          runId: run_id
        });
        span.addEvent('offline.queued.transform');
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'queued_offline' });
        return;
      }

      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });

      logger.error('Transformation failed', {
        jobId: job_id,
        error: (error as Error).message
      });
      throw error;
    } finally {
      span.end();
    }
  })
);

function extractRelationships(data: any[]): any[] {
  // Mock relationship extraction
  const relationships = [];

  for (let i = 0; i < data.length - 1; i++) {
    relationships.push({
      source: data[i].id,
      target: data[i + 1].id,
      type: 'RELATED_TO',
      properties: {
        confidence: 0.8,
        detected_by: 'feed-processor'
      }
    });
  }

  return relationships;
}

// Health monitoring
setInterval(async () => {
  try {
    const waiting = await ingestionQueue.waiting();
    const active = await ingestionQueue.active();
    const completed = await ingestionQueue.completed();
    const failed = await ingestionQueue.failed();
    const offlineCounts = await offlineQueue.pendingCounts();

    logger.info('Queue health', {
      ingestion: { waiting, active, completed, failed },
      offline: offlineCounts
    });

  } catch (error) {
    logger.error('Health check failed', { error: (error as Error).message });
  }
}, 30000);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down feed processor...');

  offlineQueue.stop();
  try {
    await offlineQueue.flush();
  } catch (error) {
    logger.warn('Failed to flush offline queue during shutdown', {
      error: (error as Error).message
    });
  }

  await ingestionQueue.close();
  await transformQueue.close();
  await redis.quit();
  await neo4jDriver.close();
  await pgPool.end();

  process.exit(0);
});

logger.info('🔄 Feed Processor started');
logger.info('Processing queues: ingestion, transformation');
logger.info('OpenLineage integration enabled');
logger.info('License enforcement active');