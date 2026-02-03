import { PostgresStore } from './PostgresStore.js';
import logger from '../config/logger.js';
import { getTracer, SpanKind } from '../observability/tracer.js';
import { orchestratorPartitionDeletionsTotal } from './metrics.js';

const tracer = getTracer();

export interface RetentionOptions {
    outboxTtlDays: number;
    eventTtlDays: number;
    taskTtlDays: number;
    batchSize: number;
    intervalMs: number;
    usePartitionDrop: boolean;
}

export class OrchestratorRetentionWorker {
    private running = false;
    private timer?: NodeJS.Timeout;

    constructor(
        private store: PostgresStore,
        private options: RetentionOptions = {
            outboxTtlDays: 14,
            eventTtlDays: 90,
            taskTtlDays: 90,
            batchSize: 1000,
            intervalMs: 3600000,
            usePartitionDrop: false
        }
    ) { }

    async start() {
        this.running = true;
        logger.info('OrchestratorRetentionWorker started', { options: this.options });
        this.scheduleNext();
    }

    async stop() {
        this.running = false;
        if (this.timer) clearTimeout(this.timer);
        logger.info('OrchestratorRetentionWorker stopped');
    }

    private scheduleNext() {
        if (!this.running) return;
        this.timer = setTimeout(() => this.sweep(), this.options.intervalMs);
    }

    private async sweep() {
        return tracer.withSpan('retention.sweep', async (span) => {
            try {
                logger.info('Starting retention sweep');

                const outboxCutoff = new Date(Date.now() - this.options.outboxTtlDays * 24 * 60 * 60 * 1000);
                if (this.options.usePartitionDrop) {
                    const dropped = await this.store.dropOldPartitions('orchestrator_outbox', outboxCutoff);
                    dropped.forEach(p => orchestratorPartitionDeletionsTotal.inc({ table_name: 'orchestrator_outbox', partition_name: p }));
                } else {
                    do {
                        const count = await this.store.deleteProcessedOutboxBefore(outboxCutoff, this.options.batchSize);
                        if (count < this.options.batchSize) break;
                    } while (this.running);
                }

                const eventCutoff = new Date(Date.now() - this.options.eventTtlDays * 24 * 60 * 60 * 1000);
                if (this.options.usePartitionDrop) {
                    const dropped = await this.store.dropOldPartitions('orchestrator_events', eventCutoff);
                    dropped.forEach(p => orchestratorPartitionDeletionsTotal.inc({ table_name: 'orchestrator_events', partition_name: p }));
                } else {
                    do {
                        const count = await this.store.deleteEventsBefore(eventCutoff, this.options.batchSize);
                        if (count < this.options.batchSize) break;
                    } while (this.running);
                }

                const taskCutoff = new Date(Date.now() - this.options.taskTtlDays * 24 * 60 * 60 * 1000);
                do {
                    const count = await this.store.deleteTerminalTasksBefore(taskCutoff, this.options.batchSize);
                    if (count < this.options.batchSize) break;
                } while (this.running);

                logger.info('Retention sweep completed');
            } catch (error: any) {
                logger.error({ err: error }, 'Error during retention sweep');
                span.recordException(error);
            } finally {
                this.scheduleNext();
            }
        }, { kind: SpanKind.INTERNAL });
    }
}
