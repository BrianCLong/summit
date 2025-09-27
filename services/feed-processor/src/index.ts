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
import { spawn } from 'child_process';
import path from 'path';

const NODE_ENV = process.env.NODE_ENV || 'development';

// Logger
const logger = pino({
  level: NODE_ENV === 'development' ? 'debug' : 'info',
  ...(NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {})
});

type SentimentResult = {
  label: string;
  confidence: number;
  score: number;
  method: string;
  model?: string;
  probabilities?: Record<string, number>;
  token_count?: number;
  text_sample?: string;
  computed_at?: string;
};

const TEXT_FIELD_CANDIDATES = new Set([
  'text',
  'content',
  'description',
  'notes',
  'summary',
  'message',
  'body',
  'headline',
  'title'
]);

const PYTHON_EXECUTABLE = process.env.ML_PYTHON_PATH || 'python3';
const SENTIMENT_SCRIPT_PATH = process.env.SENTIMENT_SCRIPT_PATH
  || path.resolve(__dirname, '..', '..', '..', 'server', 'ml', 'models', 'sentiment_analysis.py');

let sentimentSupportEnabled = true;

function resolveTenantId(entity: any): string | undefined {
  if (!entity || typeof entity !== 'object') {
    return undefined;
  }

  const candidates = [
    entity.tenantId,
    entity.tenant_id,
    entity.tenant,
    entity.tenantID,
    entity?.properties?.tenantId,
    entity?.metadata?.tenantId
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return undefined;
}

function extractTextForSentiment(entity: any): string | null {
  if (!entity || typeof entity !== 'object') {
    return null;
  }

  const collected: string[] = [];

  const visit = (value: any, key?: string, depth: number = 0) => {
    if (value == null) {
      return;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }

      const looksLikeText = /\s/.test(trimmed) && trimmed.length > 20;
      if ((key && TEXT_FIELD_CANDIDATES.has(key)) || looksLikeText) {
        collected.push(trimmed);
      }
      return;
    }

    if (depth >= 2) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, key, depth + 1));
      return;
    }

    if (typeof value === 'object') {
      for (const [childKey, childValue] of Object.entries(value)) {
        visit(childValue, childKey, depth + 1);
      }
    }
  };

  visit(entity);

  if (collected.length === 0) {
    return null;
  }

  return collected.join('\n\n');
}

async function analyzeSentimentForEntity(entity: any): Promise<SentimentResult | null> {
  if (!sentimentSupportEnabled) {
    return null;
  }

  const text = extractTextForSentiment(entity);
  if (!text) {
    return null;
  }

  const entityId = typeof entity?.id === 'string' ? entity.id : uuidv4();
  const encodedText = Buffer.from(text, 'utf8').toString('base64');
  const args = [SENTIMENT_SCRIPT_PATH, '--text-base64', encodedText];

  const metadata = { entity_id: entityId };
  args.push('--metadata', JSON.stringify(metadata));

  return new Promise((resolve) => {
    const python = spawn(PYTHON_EXECUTABLE, args);
    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    python.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    python.on('close', (code) => {
      if (code === 0 && stdout.trim().length > 0) {
        try {
          const parsed = JSON.parse(stdout);
          resolve(parsed as SentimentResult);
          return;
        } catch (error) {
          logger.warn('Failed to parse sentiment analysis response', {
            entityId,
            error: (error as Error).message,
          });
        }
      } else if (code !== 0) {
        logger.warn('Sentiment analysis process returned non-zero exit code', {
          entityId,
          code,
          stderr: stderr.trim(),
        });
      }

      if (stderr.includes('No such file') || stderr.includes('not found')) {
        sentimentSupportEnabled = false;
      }

      resolve(null);
    });

    python.on('error', (error) => {
      logger.error('Failed to spawn sentiment analysis process', {
        entityId,
        error: error.message,
      });
      sentimentSupportEnabled = false;
      resolve(null);
    });
  });
}

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

// Graph storage
class GraphStorage {
  async storeEntities(entities: any[], jobId: string): Promise<void> {
    const session = neo4jDriver.session();

    const entitiesWithSentiment: Array<{
      entity: any;
      sentiment: SentimentResult | null;
      tenantId?: string;
    }> = [];

    for (const entity of entities) {
      let sentiment: SentimentResult | null = null;
      try {
        sentiment = await analyzeSentimentForEntity(entity);
      } catch (error) {
        logger.warn('Sentiment analysis failed for entity', {
          entityId: entity?.id,
          error: (error as Error).message,
        });
      }

      entitiesWithSentiment.push({
        entity,
        sentiment,
        tenantId: resolveTenantId(entity),
      });
    }

    try {
      await session.executeWrite(async tx => {
        for (const entry of entitiesWithSentiment) {
          const { entity, sentiment, tenantId } = entry;

          await tx.run(
            `MERGE (n:Entity {id: $id})
             SET n += $properties, n.ingestion_job = $jobId, n.updated_at = datetime()`,
            {
              id: entity.id,
              properties: entity,
              jobId
            }
          );

          if (tenantId) {
            await tx.run(
              `MATCH (n:Entity {id: $id})
               SET n.tenantId = coalesce(n.tenantId, $tenantId)`,
              {
                id: entity.id,
                tenantId
              }
            );
          }

          if (sentiment) {
            const sentimentId = uuidv4();
            const sentimentProps: Record<string, any> = {
              id: sentimentId,
              entity_id: entity.id,
              label: sentiment.label,
              confidence: sentiment.confidence,
              score: sentiment.score,
              method: sentiment.method,
              model: sentiment.model,
              probabilities: sentiment.probabilities || {},
              token_count: sentiment.token_count ?? null,
              text_sample: sentiment.text_sample ?? null,
              computed_at: sentiment.computed_at || new Date().toISOString(),
              ingestion_job: jobId,
            };

            if (tenantId) {
              sentimentProps.tenantId = tenantId;
            }

            if (sentimentProps.token_count === null) {
              delete sentimentProps.token_count;
            }

            if (!sentimentProps.text_sample) {
              delete sentimentProps.text_sample;
            }

            await tx.run(
              `MATCH (n:Entity {id: $entityId})
               MERGE (s:SentimentResult {id: $sentimentId})
               SET s += $sentimentProps
               MERGE (n)-[r:HAS_SENTIMENT]->(s)
               SET r.ingestion_job = $jobId,
                   r.updated_at = datetime(),
                   r.tenantId = coalesce(r.tenantId, $tenantId)
               SET n.sentiment_label = $sentimentLabel,
                   n.sentiment_confidence = $sentimentConfidence,
                   n.sentiment_score = $sentimentScore`,
              {
                entityId: entity.id,
                sentimentId,
                sentimentProps,
                jobId,
                tenantId: tenantId ?? null,
                sentimentLabel: sentiment.label,
                sentimentConfidence: sentiment.confidence,
                sentimentScore: sentiment.score
              }
            );
          }
        }
      });

      logger.info('Stored entities in graph', {
        count: entitiesWithSentiment.length,
        jobId
      });

    } finally {
      await session.close();
    }
  }

  async createRelationships(relationships: any[], jobId: string): Promise<void> {
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
  }
}

const graphStorage = new GraphStorage();

// Job processors
ingestionQueue.process('ingest-data', 5, async (job) => {
  const jobData = IngestionJobSchema.parse(job.data);
  const runId = uuidv4();

  try {
    // Emit START event
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

    // Check license compliance
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

    // Execute connector
    const connector = connectors[jobData.source_type];
    if (!connector) {
      throw new Error(`Unknown source type: ${jobData.source_type}`);
    }

    const rawData = await connector(jobData.source_config);

    // Transform data if rules provided
    let transformedData = rawData;
    if (jobData.transform_rules && jobData.transform_rules.length > 0) {
      // Add to transform queue
      await transformQueue.add('transform-data', {
        job_id: jobData.job_id,
        raw_data: rawData,
        transform_rules: jobData.transform_rules,
        run_id: runId
      });
    } else {
      // Store directly
      await graphStorage.storeEntities(transformedData, jobData.job_id);
    }

    // Emit COMPLETE event
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

  } catch (error) {
    logger.error('Ingestion job failed', {
      jobId: jobData.job_id,
      error: (error as Error).message,
      runId
    });

    // Emit FAIL event
    await lineageClient.emitEvent(
      lineageClient.createRunEvent('FAIL', `ingest-${jobData.source_type}`, runId)
    );

    throw error;
  }
});

transformQueue.process('transform-data', 3, async (job) => {
  const { job_id, raw_data, transform_rules, run_id } = job.data;

  try {
    logger.info('Starting data transformation', { jobId: job_id, runId: run_id });

    // Apply transformation rules
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
          // Mock enrichment
          transformedData = transformedData.map((record: any) => ({
            ...record,
            enriched: true,
            confidence: 0.95
          }));
          break;
      }
    }

    // Store transformed data
    await graphStorage.storeEntities(transformedData, job_id);

    // Extract relationships if configured
    const relationships = extractRelationships(transformedData);
    if (relationships.length > 0) {
      await graphStorage.createRelationships(relationships, job_id);
    }

    logger.info('Transformation completed', {
      jobId: job_id,
      inputRecords: raw_data.length,
      outputRecords: transformedData.length,
      relationships: relationships.length
    });

  } catch (error) {
    logger.error('Transformation failed', {
      jobId: job_id,
      error: (error as Error).message
    });
    throw error;
  }
});

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

    logger.info('Queue health', {
      ingestion: { waiting, active, completed, failed }
    });

  } catch (error) {
    logger.error('Health check failed', error);
  }
}, 30000);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down feed processor...');

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