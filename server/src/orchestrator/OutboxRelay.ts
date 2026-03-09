import { Pool, PoolClient } from 'pg';
import { getPostgresPool } from '../db/postgres.js';
import { PostgresStore } from './PostgresStore.js';
import { maestro } from './maestro.js';
import { logger } from '../config/logger.js';
import { getTracer, SpanStatusCode, SpanKind } from '../observability/tracer.js';

export class OutboxRelay {
    private static instance: OutboxRelay;
    private running = false;
    private pollIntervalMs = 5000;
    private batchSize = 10;
    private pool: Pool;
    private store: PostgresStore;

    private constructor() {
        this.pool = getPostgresPool();
        this.store = new PostgresStore(this.pool);
    }

    static getInstance(): OutboxRelay {
        if (!OutboxRelay.instance) {
            OutboxRelay.instance = new OutboxRelay();
        }
        return OutboxRelay.instance;
    }

    async start() {
        if (this.running) return;
        this.running = true;
        logger.info('Outbox Relay starting', { pollInterval: this.pollIntervalMs });

        while (this.running) {
            try {
                await this.poll();
                await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs));
            } catch (error) {
                logger.error({ err: error }, 'Error in Outbox Relay poll loop');
            }
        }
    }

    async stop() {
        this.running = false;
        logger.info('Outbox Relay stopping');
    }

    private async poll() {
        const tracer = getTracer();
        await tracer.withSpan('outbox.poll', async (span) => {
            const client = await this.pool.connect();
            try {
                await client.query('BEGIN');

                // Fetch PENDING outbox items
                const res = await client.query(
                    `SELECT id, tenant_id, event_type, payload 
                     FROM orchestrator_outbox 
                     WHERE status = 'PENDING' 
                     OR (status = 'FAILED' AND retry_count < 5 AND last_retry_at < NOW() - INTERVAL '1 minute')
                     ORDER BY created_at ASC 
                     LIMIT $1 
                     FOR UPDATE SKIP LOCKED`,
                    [this.batchSize]
                );

                span.setAttribute('outbox.batch_size', res.rowCount || 0);

                for (const row of res.rows) {
                    await this.processItem(client, row);
                }

                await client.query('COMMIT');
            } catch (error: any) {
                await client.query('ROLLBACK');
                logger.error({ err: error }, 'Failed to poll outbox');
                span.recordException(error);
                span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
            } finally {
                client.release();
            }
        });
    }

    private async processItem(client: PoolClient, row: any) {
        const { id, tenant_id, event_type, payload } = row;
        const tracer = getTracer();

        await tracer.withSpan(`outbox.process.${event_type}`, async (span) => {
            span.setAttribute('outbox.id', id);
            span.setAttribute('outbox.tenant_id', tenant_id);

            try {
                if (event_type === 'RUN_STARTED') {
                    await this.handleRunStarted(payload);
                } else {
                    logger.warn({ event_type }, 'Unknown outbox event type');
                }

                // Mark as SENT
                await client.query(
                    `UPDATE orchestrator_outbox 
                     SET status = 'SENT', processed_at = NOW(), updated_at = NOW() 
                     WHERE id = $1`,
                    [id]
                );
            } catch (error: any) {
                logger.error({ err: error, id }, 'Failed to process outbox item');
                span.recordException(error);

                // Mark as FAILED or DEAD
                await client.query(
                    `UPDATE orchestrator_outbox 
                     SET status = CASE WHEN retry_count >= 5 THEN 'DEAD' ELSE 'FAILED' END,
                         retry_count = retry_count + 1,
                         last_error = $1,
                         last_retry_at = NOW(),
                         updated_at = NOW()
                     WHERE id = $1`,
                    [error.message || String(error), id]
                );
            }
        }, { kind: SpanKind.CONSUMER });
    }

    private async handleRunStarted(payload: any) {
        // Relay to BullMQ Maestro Orchestrator
        // Mapping RunSpine payload to AgentTask
        const task = {
            kind: 'plan' as const, // Start with planning
            repo: payload.metadata?.repo_url || 'unknown-repo',
            issue: payload.inputPayload || 'New execution request',
            budgetUSD: 5.0, // Default budget
            context: {
                runId: payload.runId,
                workflowId: payload.workflowId,
                principalId: payload.principalId,
                env: payload.env,
                input: payload.inputPayload
            },
            metadata: {
                actor: payload.principalId,
                timestamp: new Date().toISOString(),
                sprint_version: 'GA-RC1'
            }
        };

        await maestro.enqueueTask(task);
        logger.info('Outbox event relayed to Maestro', { runId: payload.runId });
    }
}

export const outboxRelay = OutboxRelay.getInstance();
