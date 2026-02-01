/**
 * Outbox Processor
 * Ensures at-least-once delivery of workflow events to external systems.
 */

import { Pool } from 'pg';
import { trace, SpanStatusCode, propagation, context as otelContext } from '@opentelemetry/api';

const tracer = trace.getTracer('maestro-outbox-processor');

export interface OutboxConfig {
  pollIntervalMs: number;
  maxRetries: number;
  batchSize: number;
}

export class OutboxProcessor {
  private isRunning: boolean = false;
  private timer?: NodeJS.Timeout;

  constructor(
    private pool: Pool,
    private config: OutboxConfig = { pollIntervalMs: 5000, maxRetries: 5, batchSize: 10 }
  ) {}

  start() {
    this.isRunning = true;
    this.scheduleNext();
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {clearTimeout(this.timer);}
  }

  private scheduleNext() {
    if (!this.isRunning) {return;}
    this.timer = setTimeout(() => this.processOutbox(), this.config.pollIntervalMs);
  }

  private async processOutbox() {
    await tracer.startActiveSpan('processOutbox', async (span) => {
      try {
        const client = await this.pool.connect();
        try {
          // Select pending entries
          const result = await client.query(
            `
            SELECT * FROM workflow_outbox 
            WHERE status = 'pending' AND retry_count < $1
            ORDER BY created_at ASC
            LIMIT $2
            FOR UPDATE SKIP LOCKED
          `,
            [this.config.maxRetries, this.config.batchSize]
          );

          span.setAttribute('outbox.count', result.rows.length);

          for (const row of result.rows) {
            await this.processEntry(row);
          }
        } finally {
          client.release();
        }
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      } finally {
        span.end();
        this.scheduleNext();
      }
    });
  }

  private async processEntry(row: any) {
    // Reconstruct OTEL context from stored trace_context
    const parentContext = propagation.extract(otelContext.active(), row.trace_context || {});

    await tracer.startActiveSpan('publishEvent', {}, parentContext, async (span) => {
      span.setAttributes({
        'run.id': row.run_id,
        'event.type': row.event_type,
        'outbox.id': row.id
      });

      try {
        // SIMULATED PUBLISH
        // In a real system, this would call a message bus (Kafka, RabbitMQ, SNS)
        // eslint-disable-next-line no-console
        console.log(`[Outbox] Publishing ${row.event_type} for run ${row.run_id}`);
        
        // Mark as published
        await this.pool.query(
          `UPDATE workflow_outbox SET status = 'published', processed_at = NOW() WHERE id = $1`,
          [row.id]
        );
        
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`[Outbox] Failed to publish ${row.id}:`, error);
        await this.pool.query(
          `UPDATE workflow_outbox SET retry_count = retry_count + 1, last_error = $1 WHERE id = $2`,
          [(error as Error).message, row.id]
        );
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      } finally {
        span.end();
      }
    });
  }
}
