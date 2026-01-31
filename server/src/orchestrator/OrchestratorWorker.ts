import { OrchestratorStore, Task, TaskStatus, OrchestratorEvent } from '@summit/orchestrator';
import { getPostgresPool } from '../db/postgres.js';
import { otelService } from '../middleware/observability/otel-tracing.js';
import baseLogger from '../utils/logger.js';
import { PostgresStore } from './PostgresStore.js';
import { cryptoSecureRandom } from '../utils/crypto-secure-random.js';
import { orchestratorMetrics } from './metrics.js';

const logger = baseLogger.child({ component: 'OrchestratorWorker' });

export type TaskHandler = (task: Task) => Promise<{
    status: 'completed' | 'failed';
    payload?: any;
    error?: string;
    outboxItems?: { topic: string; payload: any }[];
}>;

export interface WorkerConfig {
    workerId?: string;
    pollIntervalMs?: number;
    leaseDurationMs?: number;
    heartbeatIntervalMs?: number;
    maxConcurrentTasks?: number;
}

export class OrchestratorWorker {
    private workerId: string;
    private store: OrchestratorStore;
    private handlers: Map<string, TaskHandler> = new Map();
    private running = false;
    private pollIntervalMs: number;
    private leaseDurationMs: number;
    private heartbeatIntervalMs: number;
    private activeTasks: Set<string> = new Set();
    private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map();

    constructor(store?: OrchestratorStore, config: WorkerConfig = {}) {
        this.workerId = config.workerId || `worker-${cryptoSecureRandom.hex(4)}`;
        this.store = store || new PostgresStore();
        this.pollIntervalMs = config.pollIntervalMs || 1000;
        this.leaseDurationMs = config.leaseDurationMs || 30000;
        this.heartbeatIntervalMs = config.heartbeatIntervalMs || 10000;
    }

    registerHandler(subject: string, handler: TaskHandler) {
        this.handlers.set(subject, handler);
    }

    async start() {
        if (this.running) return;
        this.running = true;
        logger.info({ worker_id: this.workerId }, 'Orchestrator worker started');
        this.poll();
    }

    async stop() {
        this.running = false;
        // Wait for active tasks or kill them? For now, just stop polling.
        logger.info({ worker_id: this.workerId }, 'Orchestrator worker stopping');
    }

    private async poll() {
        if (!this.running) return;

        try {
            const task = await this.store.claimTask(this.workerId, this.leaseDurationMs);
            if (task) {
                // Don't await, run in background
                this.executeTask(task).catch(err => {
                    logger.error({ task_id: task.id, error: err.message }, 'Background task execution failed');
                });

                // Immediately poll again if we found a task
                setImmediate(() => this.poll());
                return;
            }

            // Update metrics when idle
            await this.reportGauges();

        } catch (error: any) {
            logger.error({ error: error.message }, 'Worker poll failed');
        }

        setTimeout(() => this.poll(), this.pollIntervalMs);
    }

    private async executeTask(task: Task) {
        const span = otelService.createSpan('orchestrator.worker.execute', {
            task_id: task.id,
            subject: task.subject,
            worker_id: this.workerId
        });

        const stopTimer = orchestratorMetrics.taskDuration.startTimer({ subject: task.subject });
        this.activeTasks.add(task.id);
        this.startHeartbeat(task);

        try {
            const handler = this.handlers.get(task.subject) || this.handlers.get('*');
            if (!handler) {
                throw new Error(`No handler registered for task subject: ${task.subject}`);
            }

            logger.info({ task_id: task.id, subject: task.subject }, 'Executing task');
            const result = await handler(task);

            await this.commitTaskResult(task, result);

            if (result.status === 'completed') {
                orchestratorMetrics.tasksCompletedTotal.inc({ subject: task.subject });
            } else {
                orchestratorMetrics.tasksFailedTotal.inc({ subject: task.subject, error_type: result.error || 'unknown' });
            }

            logger.info({ task_id: task.id, status: result.status }, 'Task execution finished');

        } catch (error: any) {
            logger.error({ task_id: task.id, error: error.message }, 'Task execution failed');
            orchestratorMetrics.tasksFailedTotal.inc({ subject: task.subject, error_type: error.name });
            await this.handleFailure(task, error);
        } finally {
            stopTimer();
            this.stopHeartbeat(task.id);
            this.activeTasks.delete(task.id);
            span?.end();
        }
    }

    private startHeartbeat(task: Task) {
        const timer = setInterval(async () => {
            try {
                await this.store.heartbeatTask(task.id, this.workerId, this.leaseDurationMs);
                logger.debug({ task_id: task.id }, 'Heartbeat sent');
            } catch (err: any) {
                logger.error({ task_id: task.id, error: err.message }, 'Heartbeat failed');
                // If heartbeat fails consistently, we might need to cancel the task
            }
        }, this.heartbeatIntervalMs);

        this.heartbeatTimers.set(task.id, timer);
    }

    private stopHeartbeat(taskId: string) {
        const timer = this.heartbeatTimers.get(taskId);
        if (timer) {
            clearInterval(timer);
            this.heartbeatTimers.delete(taskId);
        }
    }

    private async commitTaskResult(task: Task, result: {
        status: 'completed' | 'failed' | 'pending';
        payload?: any;
        error?: string;
        readyAt?: string;
        outboxItems?: { topic: string; payload: any }[];
    }) {
        await this.store.withTransaction(async (txStore) => {
            // 1. Log the event
            const event: OrchestratorEvent = {
                evidence_id: `EV-${task.id}-${Date.now()}`,
                type: result.status === 'completed' ? 'TASK_COMPLETED' :
                    result.status === 'failed' ? 'TASK_FAILED' : 'TASK_RETRYING',
                team_id: 'system',
                payload: {
                    taskId: task.id,
                    result: result.payload,
                    error: result.error,
                    attempt: task.attempts
                }
            };
            await txStore.saveEvent(event);

            // 2. Update task status
            await txStore.updateTaskStatus(task.id, result.status as TaskStatus, {
                completedAt: result.status === 'completed' || result.status === 'failed' ? new Date().toISOString() : undefined,
                readyAt: result.readyAt,
                expectedVersion: (task as any).version + 1
            });

            // 3. Side effects
            if (result.outboxItems) {
                for (const item of result.outboxItems) {
                    await txStore.saveToOutbox(item.topic, item.payload);
                }
            }
        });
    }

    private async handleFailure(task: Task, error: Error) {
        try {
            const nextAttempt = task.attempts; // Note: claimTask already incremented it in DB, but task.attempts might be the old value?
            // Actually, my claimTask RETURNING row already has the NEW attempts value.

            if (task.attempts < task.maxAttempts) {
                // Exponential backoff: 1s, 2s, 4s, 8s...
                const backoffMs = Math.pow(2, task.attempts) * 1000;
                const readyAt = new Date(Date.now() + backoffMs).toISOString();

                logger.info({ task_id: task.id, attempts: task.attempts, backoffMs }, 'Scheduling task retry');

                await this.commitTaskResult(task, {
                    status: 'pending',
                    error: error.message,
                    readyAt
                });
            } else {
                logger.error({ task_id: task.id, attempts: task.attempts }, 'Task permanent failure');
                await this.commitTaskResult(task, {
                    status: 'failed',
                    error: error.message
                });
            }
        } catch (err: any) {
            logger.error({ task_id: task.id, error: err.message }, 'Failed to record task failure');
        }
    }

    private async reportGauges() {
        try {
            const metrics = await this.store.getQueueMetrics();
            orchestratorMetrics.readyBacklog.set(metrics.readyTasks);
            orchestratorMetrics.runningBacklog.set(metrics.runningTasks);
            orchestratorMetrics.outboxBacklog.set(metrics.outboxBacklog);
        } catch (err: any) {
            logger.error({ error: err.message }, 'Failed to report queue metrics');
        }
    }
}
