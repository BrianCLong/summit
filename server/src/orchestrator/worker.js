"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorWorker = void 0;
const logger_js_1 = __importDefault(require("../config/logger.js"));
const metrics_js_1 = require("./metrics.js");
const tracer_js_1 = require("../observability/tracer.js");
const tracer = (0, tracer_js_1.getTracer)();
class OrchestratorWorker {
    store;
    options;
    running = false;
    activeTasks = new Map();
    constructor(store, options) {
        this.store = store;
        this.options = options;
    }
    async start() {
        this.running = true;
        logger_js_1.default.info('Orchestrator worker starting', { workerId: this.options.workerId });
        while (this.running) {
            try {
                await this.poll();
                await new Promise(resolve => setTimeout(resolve, this.options.pollIntervalMs));
            }
            catch (error) {
                logger_js_1.default.error({ err: error }, 'Error in worker poll loop');
            }
        }
    }
    async stop() {
        this.running = false;
        logger_js_1.default.info('Orchestrator worker stopping', { workerId: this.options.workerId });
        for (const { heartbeatTimer } of this.activeTasks.values()) {
            clearInterval(heartbeatTimer);
        }
        this.activeTasks.clear();
    }
    async poll() {
        if (this.activeTasks.size >= this.options.concurrency)
            return;
        const tasks = await this.store.claimReadyTasks(this.options.workerId, Math.min(this.options.batchSize, this.options.concurrency - this.activeTasks.size), this.options.leaseDurationMs);
        for (const task of tasks) {
            this.handleTask(task).catch(err => logger_js_1.default.error({ err, taskId: task.id }, 'Unhandled error in task handler'));
        }
    }
    async handleTask(task) {
        const startTime = Date.now();
        metrics_js_1.orchestratorActiveTasksGauge.inc({ worker_id: this.options.workerId });
        const heartbeatTimer = setInterval(async () => {
            try {
                const success = await this.store.heartbeatTask(task.id, this.options.workerId, task.version, this.options.leaseDurationMs);
                if (!success)
                    metrics_js_1.orchestratorHeartbeatFailuresTotal.inc({ worker_id: this.options.workerId, reason: 'cas_failure' });
            }
            catch (err) {
                metrics_js_1.orchestratorHeartbeatFailuresTotal.inc({ worker_id: this.options.workerId, reason: 'error' });
            }
        }, this.options.heartbeatIntervalMs);
        this.activeTasks.set(task.id, { task, heartbeatTimer });
        try {
            await tracer.withSpan(`worker.execute.${task.kind}`, async (span) => {
                span.setAttributes({ 'task.id': task.id, 'task.kind': task.kind, 'worker.id': this.options.workerId });
                const result = await this.execute(task);
                await this.store.completeTask(task.id, this.options.workerId, task.version, result);
                metrics_js_1.orchestratorTasksTotal.inc({ kind: task.kind, status: 'succeeded', worker_id: this.options.workerId });
            }, { kind: tracer_js_1.SpanKind.CONSUMER });
        }
        catch (error) {
            metrics_js_1.orchestratorTasksTotal.inc({ kind: task.kind, status: 'failed', worker_id: this.options.workerId });
            await this.store.failTask(task.id, this.options.workerId, task.version, error.message || String(error), true);
        }
        finally {
            const duration = (Date.now() - startTime) / 1000;
            metrics_js_1.orchestratorTaskDurationSeconds.observe({ kind: task.kind, status: 'finished' }, duration);
            metrics_js_1.orchestratorActiveTasksGauge.dec({ worker_id: this.options.workerId });
            const active = this.activeTasks.get(task.id);
            if (active) {
                clearInterval(active.heartbeatTimer);
                this.activeTasks.delete(task.id);
            }
        }
    }
}
exports.OrchestratorWorker = OrchestratorWorker;
