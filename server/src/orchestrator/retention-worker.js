"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorRetentionWorker = void 0;
const logger_js_1 = __importDefault(require("../config/logger.js"));
const tracer_js_1 = require("../observability/tracer.js");
const metrics_js_1 = require("./metrics.js");
const tracer = (0, tracer_js_1.getTracer)();
class OrchestratorRetentionWorker {
    store;
    options;
    running = false;
    timer;
    constructor(store, options = {
        outboxTtlDays: 14,
        eventTtlDays: 90,
        taskTtlDays: 90,
        batchSize: 1000,
        intervalMs: 3600000,
        usePartitionDrop: false
    }) {
        this.store = store;
        this.options = options;
    }
    async start() {
        this.running = true;
        logger_js_1.default.info('OrchestratorRetentionWorker started', { options: this.options });
        this.scheduleNext();
    }
    async stop() {
        this.running = false;
        if (this.timer)
            clearTimeout(this.timer);
        logger_js_1.default.info('OrchestratorRetentionWorker stopped');
    }
    scheduleNext() {
        if (!this.running)
            return;
        this.timer = setTimeout(() => this.sweep(), this.options.intervalMs);
    }
    async sweep() {
        return tracer.withSpan('retention.sweep', async (span) => {
            try {
                logger_js_1.default.info('Starting retention sweep');
                const outboxCutoff = new Date(Date.now() - this.options.outboxTtlDays * 24 * 60 * 60 * 1000);
                if (this.options.usePartitionDrop) {
                    const dropped = await this.store.dropOldPartitions('orchestrator_outbox', outboxCutoff);
                    dropped.forEach(p => metrics_js_1.orchestratorPartitionDeletionsTotal.inc({ table_name: 'orchestrator_outbox', partition_name: p }));
                }
                else {
                    do {
                        const count = await this.store.deleteProcessedOutboxBefore(outboxCutoff, this.options.batchSize);
                        if (count < this.options.batchSize)
                            break;
                    } while (this.running);
                }
                const eventCutoff = new Date(Date.now() - this.options.eventTtlDays * 24 * 60 * 60 * 1000);
                if (this.options.usePartitionDrop) {
                    const dropped = await this.store.dropOldPartitions('orchestrator_events', eventCutoff);
                    dropped.forEach(p => metrics_js_1.orchestratorPartitionDeletionsTotal.inc({ table_name: 'orchestrator_events', partition_name: p }));
                }
                else {
                    do {
                        const count = await this.store.deleteEventsBefore(eventCutoff, this.options.batchSize);
                        if (count < this.options.batchSize)
                            break;
                    } while (this.running);
                }
                const taskCutoff = new Date(Date.now() - this.options.taskTtlDays * 24 * 60 * 60 * 1000);
                do {
                    const count = await this.store.deleteTerminalTasksBefore(taskCutoff, this.options.batchSize);
                    if (count < this.options.batchSize)
                        break;
                } while (this.running);
                logger_js_1.default.info('Retention sweep completed');
            }
            catch (error) {
                logger_js_1.default.error({ err: error }, 'Error during retention sweep');
                span.recordException(error);
            }
            finally {
                this.scheduleNext();
            }
        }, { kind: tracer_js_1.SpanKind.INTERNAL });
    }
}
exports.OrchestratorRetentionWorker = OrchestratorRetentionWorker;
