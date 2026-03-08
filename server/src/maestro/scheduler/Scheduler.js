"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduler = exports.MaestroScheduler = void 0;
const runs_repo_js_1 = require("../runs/runs-repo.js");
const executors_repo_js_1 = require("../executors/executors-repo.js");
const pino_1 = __importDefault(require("pino"));
const QueueHelper_js_1 = require("./QueueHelper.js");
const ExecutorSelector_js_1 = require("./ExecutorSelector.js");
const logger = pino_1.default({ name: 'maestro-scheduler' });
class MaestroScheduler {
    static _instance;
    isProcessing = false;
    queueHelper;
    executorSelector;
    intervalId = null;
    constructor() {
        this.queueHelper = new QueueHelper_js_1.QueueHelper();
        this.executorSelector = new ExecutorSelector_js_1.ExecutorSelector();
        this.start();
    }
    static getInstance() {
        if (!MaestroScheduler._instance) {
            MaestroScheduler._instance = new MaestroScheduler();
        }
        return MaestroScheduler._instance;
    }
    start() {
        if (!this.intervalId) {
            // Poll every 5 seconds
            this.intervalId = setInterval(() => this.processQueue(), 5000);
            // Initial population from DB to handle restarts
            this.recoverPendingRuns();
        }
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    // Recover any runs that are in 'queued' state from the DB
    async recoverPendingRuns() {
        try {
            // Placeholder for DB recovery logic
            // In a real implementation, we would query runsRepo for status='queued'
            // and re-enqueue them.
        }
        catch (err) {
            logger.error({ err }, 'Failed to recover pending runs');
        }
    }
    /**
     * Enqueues a run for execution.
     * @param runId The ID of the run.
     * @param tenantId The tenant ID.
     * @param priority Priority of the run (higher is better).
     */
    async enqueueRun(runId, tenantId, priority = 0) {
        logger.info({ runId, tenantId, priority }, 'Enqueueing run');
        this.queueHelper.enqueue({ runId, tenantId, priority });
        // Trigger processing immediately if idle
        if (!this.isProcessing) {
            this.processQueue();
        }
    }
    /**
     * Processes the queue, assigning runs to executors.
     */
    async processQueue() {
        if (this.isProcessing)
            return;
        this.isProcessing = true;
        try {
            while (!this.queueHelper.isEmpty()) {
                const item = this.queueHelper.peek();
                if (!item)
                    break;
                // Find any 'ready' executor for the tenant
                const executors = await executors_repo_js_1.executorsRepo.list(item.tenantId);
                const candidateExecutor = this.executorSelector.selectExecutor(executors, item.tenantId);
                if (candidateExecutor) {
                    const updatedExecutor = await executors_repo_js_1.executorsRepo.update(candidateExecutor.id, { status: 'busy' }, item.tenantId);
                    if (updatedExecutor && updatedExecutor.status === 'busy') {
                        // Dequeue
                        this.queueHelper.dequeue();
                        logger.info({ runId: item.runId, executorId: candidateExecutor.id }, 'Assigning run to executor');
                        // Update run status to 'running' and assign executor
                        await runs_repo_js_1.runsRepo.update(item.runId, {
                            status: 'running',
                            executor_id: candidateExecutor.id,
                            started_at: new Date()
                        }, item.tenantId);
                    }
                    else {
                        // Failed to claim, break inner loop to retry finding executor
                        logger.warn({ executorId: candidateExecutor.id }, 'Failed to claim executor, retrying...');
                        break;
                    }
                }
                else {
                    // No executors available, wait for next cycle
                    logger.debug({ tenantId: item.tenantId }, 'No executors available, waiting...');
                    break;
                }
            }
        }
        catch (error) {
            logger.error({ error }, 'Error processing scheduler queue');
        }
        finally {
            this.isProcessing = false;
        }
    }
    // Expose queue status for monitoring
    getQueueStatus() {
        return {
            size: this.queueHelper.size,
            processing: this.isProcessing
        };
    }
}
exports.MaestroScheduler = MaestroScheduler;
exports.scheduler = MaestroScheduler.getInstance();
