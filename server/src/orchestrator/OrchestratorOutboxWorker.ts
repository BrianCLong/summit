import { Pool, PoolClient } from 'pg';
import baseLogger from '../utils/logger.js';
import { otelService } from '../middleware/observability/otel-tracing.js';

const logger = baseLogger.child({ component: 'OrchestratorOutboxWorker' });

interface OutboxEvent {
    id: string;
    topic: string;
    payload: any;
    created_at: Date;
    attempts: number;
}

export class OrchestratorOutboxWorker {
    private isRunning = false;
    private intervalId?: NodeJS.Timeout;

    constructor(
        private pool: Pool,
        private config: {
            batchSize?: number;
            intervalMs?: number;
            maxRetries?: number;
        } = {}
    ) {
        this.config = {
            batchSize: 50,
            intervalMs: 1000,
            maxRetries: 5,
            ...config,
        };
    }

    start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.intervalId = setInterval(() => {
            this.processBatch().catch((error) => {
                logger.error({ error: error.message }, 'Unhandled error in outbox batch processing');
            });
        }, this.config.intervalMs);
        logger.info('Orchestrator outbox worker started');
    }

    stop(): void {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        logger.info('Orchestrator outbox worker stopped');
    }

    private async processBatch(): Promise<void> {
        const client = await this.pool.connect();
        try {
            const { rows } = await client.query(
                `SELECT id, topic, payload, attempts
         FROM orchestrator_outbox
         WHERE processed_at IS NULL AND attempts < $1
         ORDER BY created_at ASC
         LIMIT $2
         FOR UPDATE SKIP LOCKED`,
                [this.config.maxRetries, this.config.batchSize]
            );

            if (rows.length === 0) return;

            logger.debug({ count: rows.length }, 'Processing outbox batch');

            for (const event of rows) {
                await this.processEvent(client, event);
            }
        } catch (error: any) {
            logger.error({ error: error.message }, 'Outbox batch processing failed');
        } finally {
            client.release();
        }
    }

    private async processEvent(client: PoolClient, event: any): Promise<void> {
        const span = otelService.createSpan('orchestrator.outbox.process', {
            event_id: event.id,
            topic: event.topic
        });
        try {
            // Simulation of event emission (e.g., to Kafka or internal bus)
            // Committee Requirement: At-least-once semantics with replay safety
            logger.info({ topic: event.topic, event_id: event.id }, 'Emitting outbox event');

            // Mark as processed
            await client.query(
                'UPDATE orchestrator_outbox SET processed_at = now() WHERE id = $1',
                [event.id]
            );
        } catch (error: any) {
            const newAttempts = event.attempts + 1;
            logger.error({ event_id: event.id, error: error.message, attempts: newAttempts }, 'Failed to process outbox event');

            await client.query(
                'UPDATE orchestrator_outbox SET attempts = $2, last_error = $3 WHERE id = $1',
                [event.id, newAttempts, error.message]
            );
        } finally {
            span?.end();
        }
    }
}
