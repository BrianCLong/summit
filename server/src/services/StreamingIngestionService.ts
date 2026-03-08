// @ts-nocheck
import { Queue, Worker, type Job } from 'bullmq';
import { OsintConnector } from '../connectors/implementations/OsintConnector.js';
import { OsintSourceType, OsintRecord, IngestionEvent } from '../connectors/types.js';
import { provenanceLedger } from '../provenance/ledger.js';
import { ProvenanceMapping } from '@intelgraph/provenance';
import { randomUUID } from 'crypto';
import pino from 'pino';
import { Counter, Histogram } from 'prom-client';

const logger = (pino as any)({ name: 'StreamingIngestionService' });

// Metrics
const recordsIngested = new Counter({
  name: 'osint_ingestion_records_total',
  help: 'Total number of OSINT records ingested',
  labelNames: ['source_type', 'status']
});

const ingestionLatency = new Histogram({
  name: 'osint_ingestion_latency_seconds',
  help: 'Latency of ingestion processing',
  labelNames: ['source_type']
});

interface IngestionJobData {
  record: OsintRecord;
  tenantId: string;
}

export class StreamingIngestionService {
  private queue: Queue;
  private worker: Worker;
  private connectors: Map<string, OsintConnector> = new Map();
  private redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  };

  constructor() {
    this.queue = new Queue('osint-ingestion', { connection: this.redisConfig });

    // Initialize worker
    this.worker = new Worker('osint-ingestion', async (job: Job<IngestionJobData>) => {
      const start = Date.now();
      try {
        await this.processRecord(job.data);
        recordsIngested.inc({ source_type: job.data.record.sourceType, status: 'success' });
      } catch (error: any) {
        logger.error({ error, jobId: job.id }, 'Ingestion job failed');
        recordsIngested.inc({ source_type: job.data.record.sourceType, status: 'failure' });
        throw error;
      } finally {
        ingestionLatency.observe({ source_type: job.data.record.sourceType }, (Date.now() - start) / 1000);
      }
    }, {
      connection: this.redisConfig,
      concurrency: 50 // High concurrency for throughput
    });

    this.worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err }, 'Job failed');
    });
  }

  // Register a source to poll/stream from
  async registerSource(id: string, type: OsintSourceType, tenantId: string) {
    const connector = new OsintConnector({
      id,
      name: `osint-${type}-${id}`,
      type: 'osint',
      tenantId,
      sourceType: type,
      config: {}
    }, logger);

    this.connectors.set(id, connector);

    // Start streaming (simulated)
    this.startStreaming(id, connector, tenantId);
  }

  private async startStreaming(sourceId: string, connector: OsintConnector, tenantId: string) {
    try {
      const stream = await connector.fetchStream();
      for await (const record of stream) {
        await this.queue.add('ingest', { record, tenantId }, {
          removeOnComplete: true,
          removeOnFail: false // Keep failed for DLQ inspection
        });
      }
    } catch (error: any) {
      logger.error({ error, sourceId }, 'Streaming failed, restarting in 5s');
      setTimeout(() => this.startStreaming(sourceId, connector, tenantId), 5000);
    }
  }

  private async processRecord(data: IngestionJobData) {
    const { record, tenantId } = data;

    // 1. Validation (Schema Check)
    if (!record.content || !record.timestamp) {
      throw new Error('Invalid record schema');
    }

    // 2. Deduplication (simulated via Redis check or Bloom filter in real impl)
    // For now, assume unique based on ID

    // 3. Enrichment (e.g. NLP, Sentiment - mocked here)
    const enrichedRecord = {
      ...record,
      metadata: {
        ...record.metadata,
        processedAt: new Date(),
        riskScore: Math.random() // Simulated ML score
      }
    };

    // 4. Lineage Tracking
    const lineageId = randomUUID();
    const event: IngestionEvent = {
      id: randomUUID(),
      sourceId: record.id,
      timestamp: new Date(),
      data: enrichedRecord,
      metadata: {
        tenantId,
        ingestionType: 'stream'
      },
      provenance: {
        source: record.sourceType,
        sourceId: record.id,
        ingestTimestamp: new Date(),
        connectorType: 'osint',
        lineageId
      }
    };

    // Generate Sovereign OPA Input if applicable
    const isSovereign = enrichedRecord.metadata?.isSovereign || false;
    let sovereignSafeguards = null;
    if (isSovereign) {
      sovereignSafeguards = ProvenanceMapping.toSovereignInput({
        actor: { id: 'system-ingestion', role: 'admin' },
      } as any, enrichedRecord.metadata);
    }

    // Record to Provenance Ledger
    await provenanceLedger.appendEntry({
      tenantId,
      actionType: 'INGEST',
      resourceType: 'OsintRecord',
      resourceId: record.id,
      actorId: 'system-ingestion',
      actorType: 'system',
      payload: {
        mutationType: 'CREATE',
        diff: enrichedRecord
      },
      metadata: {
        lineageId,
        processingNode: 'ingestion-worker-1',
        isSovereign,
        sovereignSafeguards // Ingested records now carry Sovereign mandates
      }
    });

    // 5. Load (to DB - mocked log)
    logger.info({ id: record.id, type: record.sourceType }, 'Record ingested and persisted');
  }
}

export const streamingIngestionService = new StreamingIngestionService();
