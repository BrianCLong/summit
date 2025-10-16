import { Request, Response } from 'express';
import { trace, Span } from '@opentelemetry/api';
import { Counter, Histogram, Gauge } from 'prom-client';
import { redis } from '../subscriptions/pubsub';
import { pg } from '../db/pg';
import { neo } from '../db/neo4j';
import { deduplicationService } from './dedupe';
import crypto from 'crypto';
import { ingestDedupeRate, ingestBacklog } from '../metrics';

const tracer = trace.getTracer('http-ingest', '24.2.0');

// Enhanced metrics for v24.2
const ingestRequests = new Counter({
  name: 'ingest_http_requests_total',
  help: 'Total HTTP ingest requests',
  labelNames: ['tenant_id', 'status', 'source'],
});

const ingestLatency = new Histogram({
  name: 'ingest_http_duration_seconds',
  help: 'HTTP ingest request duration',
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0],
  labelNames: ['tenant_id', 'operation'],
});

const ingestQueueDepth = new Gauge({
  name: 'ingest_queue_depth',
  help: 'Current ingest queue depth per tenant',
  labelNames: ['tenant_id'],
});

const ingestThroughput = new Counter({
  name: 'ingest_events_processed_total',
  help: 'Total events processed successfully',
  labelNames: ['tenant_id', 'type'],
});

interface CoherenceSignal {
  tenantId: string;
  type: string;
  value: number;
  weight?: number;
  source: string;
  ts: string;
  purpose?: string;
  metadata?: Record<string, any>;
}

interface IngestRequest {
  signals: CoherenceSignal[];
  batch?: boolean;
  idempotencyKey?: string;
}

interface IngestResponse {
  accepted: number;
  rejected: number;
  errors?: string[];
  idempotent?: boolean;
}

class IngestQueue {
  private queues: Map<string, CoherenceSignal[]> = new Map();
  private processing: Map<string, boolean> = new Map();
  private readonly maxQueueSize = 10000;
  private readonly batchSize = 500;
  private readonly processingInterval = 1000; // 1 second

  constructor() {
    // Start background processing
    setInterval(() => this.processQueues(), this.processingInterval);
  }

  async enqueue(
    tenantId: string,
    signals: CoherenceSignal[],
  ): Promise<boolean> {
    const queue = this.queues.get(tenantId) || [];

    if (queue.length + signals.length > this.maxQueueSize) {
      return false; // Queue full, apply backpressure
    }

    queue.push(...signals);
    this.queues.set(tenantId, queue);
    ingestQueueDepth.set({ tenant_id: tenantId }, queue.length);

    return true;
  }

  private async processQueues() {
    for (const [tenantId, queue] of this.queues.entries()) {
      if (this.processing.get(tenantId) || queue.length === 0) {
        continue;
      }

      this.processing.set(tenantId, true);

      try {
        const batch = queue.splice(0, this.batchSize);
        await this.processBatch(tenantId, batch);
        ingestQueueDepth.set({ tenant_id: tenantId }, queue.length);
      } catch (error) {
        console.error(`Failed to process batch for tenant ${tenantId}:`, error);
      } finally {
        this.processing.set(tenantId, false);
      }
    }
  }

  private async processBatch(tenantId: string, signals: CoherenceSignal[]) {
    return tracer.startActiveSpan(
      'ingest.process_batch',
      async (span: Span) => {
        span.setAttributes({
          tenant_id: tenantId,
          batch_size: signals.length,
        });

        try {
          // Store in PostgreSQL (CoherenceScore aggregation)
          await this.updateCoherenceScores(tenantId, signals);

          // Store in Neo4j (Signal nodes)
          await this.storeSignals(tenantId, signals);

          // Update metrics
          for (const signal of signals) {
            ingestThroughput.inc({ tenant_id: tenantId, type: signal.type });
          }

          span.setAttributes({ signals_processed: signals.length });
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  private async updateCoherenceScores(
    tenantId: string,
    signals: CoherenceSignal[],
  ) {
    // Aggregate signals into coherence score
    const totalValue = signals.reduce(
      (sum, s) => sum + s.value * (s.weight || 1.0),
      0,
    );
    const totalWeight = signals.reduce((sum, s) => sum + (s.weight || 1.0), 0);
    const averageScore = totalWeight > 0 ? totalValue / totalWeight : 0;

    await pg.oneOrNone(
      `INSERT INTO coherence_scores (tenant_id, score, status, updated_at, sample_count)
       VALUES ($1, $2, $3, NOW(), $4)
       ON CONFLICT (tenant_id) 
       DO UPDATE SET 
         score = (coherence_scores.score * coherence_scores.sample_count + $2 * $4) / (coherence_scores.sample_count + $4),
         updated_at = NOW(),
         sample_count = coherence_scores.sample_count + $4`,
      [tenantId, averageScore, 'active', signals.length],
    );
  }

  private async storeSignals(tenantId: string, signals: CoherenceSignal[]) {
    const queries = signals.map((signal) => ({
      query: `
        MERGE (s:Signal {id: $id, tenant_id: $tenantId})
        SET s.type = $type,
            s.value = $value, 
            s.weight = $weight,
            s.source = $source,
            s.timestamp = datetime($ts),
            s.purpose = $purpose,
            s.updated_at = datetime()
        RETURN s.id as id`,
      params: {
        id: crypto
          .createHash('sha256')
          .update(`${tenantId}:${signal.type}:${signal.ts}`)
          .digest('hex'),
        tenantId,
        type: signal.type,
        value: signal.value,
        weight: signal.weight || 1.0,
        source: signal.source,
        ts: signal.ts,
        purpose: signal.purpose || 'investigation',
      },
    }));

    // Execute in batches to avoid transaction timeouts
    const batchSize = 100;
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);

      const session = await neo.run(
        `
        UNWIND $batch as row
        MERGE (s:Signal {id: row.id, tenant_id: row.tenantId})
        SET s += row
        RETURN count(s) as created
      `,
        { batch: batch.map((q) => q.params) },
      );
    }
  }

  getQueueStatus() {
    const status: Record<string, any> = {};
    for (const [tenantId, queue] of this.queues.entries()) {
      status[tenantId] = {
        queueLength: queue.length,
        processing: this.processing.get(tenantId) || false,
        utilizationPct: Math.round((queue.length / this.maxQueueSize) * 100),
      };
    }
    return status;
  }
}

const ingestQueue = new IngestQueue();

export async function handleHttpSignal(req: Request, res: Response) {
  const startTime = Date.now();
  const tenantId = (req.headers['x-tenant-id'] as string) || 'default';
  const idempotencyKey = req.headers['x-idempotency-key'] as string;
  const source = req.headers['user-agent'] || 'http-client';

  return tracer.startActiveSpan('ingest.http_signal', async (span: Span) => {
    span.setAttributes({
      tenant_id: tenantId,
      has_idempotency_key: !!idempotencyKey,
      source: source,
    });

    try {
      // Validate request
      const ingestReq: IngestRequest = req.body;
      if (!ingestReq.signals || !Array.isArray(ingestReq.signals)) {
        ingestRequests.inc({ tenant_id: tenantId, status: 'error', source });
        return res.status(400).json({
          error: 'Invalid request: signals array required',
        });
      }

      // Check idempotency
      if (idempotencyKey) {
        const key = `idem:${tenantId}:${idempotencyKey}`;
        const existing = await redis.get(key);

        if (existing) {
          ingestRequests.inc({
            tenant_id: tenantId,
            status: 'idempotent',
            source,
          });
          return res.status(202).json({
            accepted: 0,
            rejected: 0,
            idempotent: true,
          });
        }

        await redis.setWithTTL(key, '1', 3600); // 1 hour TTL
      }

      // Validate and enrich signals
      const validSignals: CoherenceSignal[] = [];
      const errors: string[] = [];

      for (const signal of ingestReq.signals) {
        try {
          const enriched = await validateAndEnrichSignal(signal, tenantId);

          // Check for duplicates
          const isDuplicate = await deduplicationService.checkDuplicate({
            tenantId: enriched.tenantId,
            type: enriched.type,
            value: enriched.value,
            timestamp: enriched.ts,
            source: enriched.source,
          });

          if (isDuplicate) {
            errors.push(
              `Signal is duplicate: ${enriched.type} at ${enriched.ts}`,
            );
          } else {
            validSignals.push(enriched);
          }
        } catch (error) {
          errors.push(`Signal validation failed: ${(error as Error).message}`);
        }
      }

      if (validSignals.length === 0) {
        ingestRequests.inc({ tenant_id: tenantId, status: 'error', source });
        return res.status(400).json({
          accepted: 0,
          rejected: ingestReq.signals.length,
          errors,
        });
      }

      // Attempt to enqueue
      const enqueued = await ingestQueue.enqueue(tenantId, validSignals);

      if (!enqueued) {
        ingestRequests.inc({
          tenant_id: tenantId,
          status: 'backpressure',
          source,
        });
        return res.status(429).json({
          error: 'Queue full, apply backpressure',
          'retry-after': 30,
        });
      }

      const response: IngestResponse = {
        accepted: validSignals.length,
        rejected: ingestReq.signals.length - validSignals.length,
        errors: errors.length > 0 ? errors : undefined,
      };

      ingestRequests.inc({ tenant_id: tenantId, status: 'success', source });
      ingestLatency.observe(
        { tenant_id: tenantId, operation: 'enqueue' },
        (Date.now() - startTime) / 1000,
      );

      span.setAttributes({
        signals_accepted: response.accepted,
        signals_rejected: response.rejected,
      });

      res.status(202).json(response);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: (error as Error).message });

      ingestRequests.inc({ tenant_id: tenantId, status: 'error', source });

      console.error('HTTP ingest error:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      span.end();
    }
  });
}

async function validateAndEnrichSignal(
  signal: any,
  defaultTenantId: string,
): Promise<CoherenceSignal> {
  // Basic validation
  if (typeof signal.type !== 'string' || !signal.type) {
    throw new Error('Signal type is required');
  }

  if (typeof signal.value !== 'number' || isNaN(signal.value)) {
    throw new Error('Signal value must be a valid number');
  }

  // Enrich with defaults
  const enriched: CoherenceSignal = {
    tenantId: signal.tenantId || defaultTenantId,
    type: signal.type,
    value: signal.value,
    weight: signal.weight || 1.0,
    source: signal.source || 'http-ingest',
    ts: signal.ts || new Date().toISOString(),
    purpose: signal.purpose || 'investigation',
    metadata: signal.metadata,
  };

  // Additional validation
  if (enriched.value < -1 || enriched.value > 1) {
    throw new Error('Signal value must be between -1 and 1');
  }

  return enriched;
}

export function getIngestStatus() {
  return {
    queues: ingestQueue.getQueueStatus(),
    timestamp: new Date().toISOString(),
  };
}
