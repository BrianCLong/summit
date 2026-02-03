import { PostgresStore, Task } from './PostgresStore.js';
import logger from '../config/logger.js';
import {
    orchestratorTasksTotal,
    orchestratorTaskDurationSeconds,
    orchestratorActiveTasksGauge,
    orchestratorHeartbeatFailuresTotal
} from './metrics.js';
import { getTracer, SpanKind } from '../observability/tracer.js';

const tracer = getTracer();

export interface WorkerOptions {
    workerId: string;
    concurrency: number;
    pollIntervalMs: number;
    leaseDurationMs: number;
    heartbeatIntervalMs: number;
    batchSize: number;
}

export abstract class OrchestratorWorker {
    protected running = false;
    protected activeTasks = new Map<string, { task: Task; heartbeatTimer: NodeJS.Timeout }>();

    constructor(
        protected store: PostgresStore,
        protected options: WorkerOptions
    ) { }

    async start() {
        this.running = true;
        logger.info('Orchestrator worker starting', { workerId: this.options.workerId });

        while (this.running) {
            try {
                await this.poll();
                await new Promise(resolve => setTimeout(resolve, this.options.pollIntervalMs));
            } catch (error) {
                logger.error({ err: error }, 'Error in worker poll loop');
            }
        }
    }

    async stop() {
        this.running = false;
        logger.info('Orchestrator worker stopping', { workerId: this.options.workerId });
        for (const { heartbeatTimer } of this.activeTasks.values()) {
            clearInterval(heartbeatTimer);
        }
        this.activeTasks.clear();
    }

    private async poll() {
        if (this.activeTasks.size >= this.options.concurrency) return;
        const tasks = await this.store.claimReadyTasks(
            this.options.workerId,
            Math.min(this.options.batchSize, this.options.concurrency - this.activeTasks.size),
            this.options.leaseDurationMs
        );
        for (const task of tasks) {
            this.handleTask(task).catch(err => logger.error({ err, taskId: task.id }, 'Unhandled error in task handler'));
        }
    }

    private async handleTask(task: Task) {
        const startTime = Date.now();
        orchestratorActiveTasksGauge.inc({ worker_id: this.options.workerId });

        const heartbeatTimer = setInterval(async () => {
            try {
                const success = await this.store.heartbeatTask(task.id, this.options.workerId, task.version, this.options.leaseDurationMs);
                if (!success) orchestratorHeartbeatFailuresTotal.inc({ worker_id: this.options.workerId, reason: 'cas_failure' });
            } catch (err) { orchestratorHeartbeatFailuresTotal.inc({ worker_id: this.options.workerId, reason: 'error' }); }
        }, this.options.heartbeatIntervalMs);

        this.activeTasks.set(task.id, { task, heartbeatTimer });

        try {
            await tracer.withSpan(`worker.execute.${task.kind}`, async (span) => {
                span.setAttributes({ 'task.id': task.id, 'task.kind': task.kind, 'worker.id': this.options.workerId });
                const result = await this.execute(task);
                await this.store.completeTask(task.id, this.options.workerId, task.version, result);
                orchestratorTasksTotal.inc({ kind: task.kind, status: 'succeeded', worker_id: this.options.workerId });
            }, { kind: SpanKind.CONSUMER });
        } catch (error: any) {
            orchestratorTasksTotal.inc({ kind: task.kind, status: 'failed', worker_id: this.options.workerId });
            await this.store.failTask(task.id, this.options.workerId, task.version, error.message || String(error), true);
        } finally {
            const duration = (Date.now() - startTime) / 1000;
            orchestratorTaskDurationSeconds.observe({ kind: task.kind, status: 'finished' }, duration);
            orchestratorActiveTasksGauge.dec({ worker_id: this.options.workerId });
            const active = this.activeTasks.get(task.id);
            if (active) {
                clearInterval(active.heartbeatTimer);
                this.activeTasks.delete(task.id);
            }
        }
    }

    protected abstract execute(task: Task): Promise<any>;
}
