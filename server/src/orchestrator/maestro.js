"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maestro = void 0;
// @ts-nocheck
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_js_1 = require("../utils/logger.js");
const policyGuard_js_1 = require("./policyGuard.js");
const system_monitor_js_1 = require("../lib/system-monitor.js");
const tracer_js_1 = require("../observability/tracer.js");
// Mock Budget class until we locate the real one or fix the import
class Budget {
    maxUSD;
    usedUSD;
    constructor(maxUSD) {
        this.maxUSD = maxUSD;
        this.usedUSD = 0;
    }
}
const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});
const queueOptions = {
    connection: redis,
    defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
    },
};
const maestroQueue = new bullmq_1.Queue('maestro', queueOptions);
const queueEvents = new bullmq_1.QueueEvents('maestro', { connection: redis });
class MaestroOrchestrator {
    policyGuard;
    workers = new Map();
    constructor() {
        this.policyGuard = new policyGuard_js_1.PolicyGuard();
        this.initializeWorkers();
        this.setupEventHandlers();
    }
    async enqueueTask(task) {
        const tracer = (0, tracer_js_1.getTracer)();
        return tracer.withSpan('maestro.enqueueTask', async (span) => {
            span.setAttribute('maestro.task.kind', task.kind);
            span.setAttribute('maestro.task.repo', task.repo);
            span.setAttribute('maestro.task.budget', task.budgetUSD);
            // 1. System Health Check (Backpressure)
            const health = system_monitor_js_1.systemMonitor.getHealth();
            if (health.isOverloaded) {
                throw new Error(`System overloaded: ${health.reason}. Task rejected.`);
            }
            // 2. Queue Depth Check (Backpressure)
            const waitingCount = await maestroQueue.count();
            const MAX_QUEUE_DEPTH = 1000; // Hard limit for backlog
            if (waitingCount > MAX_QUEUE_DEPTH) {
                throw new Error(`Queue full (${waitingCount} pending). Task rejected.`);
            }
            try {
                // Pre-flight policy check
                const policyResult = await this.policyGuard.checkPolicy(task);
                if (!policyResult.allowed) {
                    throw new Error(`Task blocked by policy: ${policyResult.reason}`);
                }
                const job = await maestroQueue.add(task.kind, task, {
                    jobId: `${task.kind}-${task.repo}-${Date.now()}`,
                });
                span.setAttribute('maestro.job.id', job.id || 'unknown');
                logger_js_1.logger.info('Task enqueued', {
                    taskId: job.id,
                    kind: task.kind,
                    repo: task.repo,
                    budgetUSD: task.budgetUSD,
                });
                return job.id;
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({
                    code: tracer_js_1.SpanStatusCode.ERROR,
                    message: error.message,
                });
                throw error;
            }
        }, { kind: tracer_js_1.SpanKind.PRODUCER });
    }
    async enqueueTaskChain(tasks) {
        const tracer = (0, tracer_js_1.getTracer)();
        return tracer.withSpan('maestro.enqueueTaskChain', async (span) => {
            span.setAttribute('maestro.chain.length', tasks.length);
            const taskIds = [];
            for (let i = 0; i < tasks.length; i++) {
                const task = tasks[i];
                if (i > 0) {
                    task.dependencies = [taskIds[i - 1]];
                }
                const taskId = await this.enqueueTask(task);
                taskIds.push(taskId);
            }
            return taskIds;
        });
    }
    initializeWorkers() {
        const workerOptions = {
            connection: redis,
            concurrency: 3,
            autorun: true,
        };
        // Planner Agent
        const plannerWorker = new bullmq_1.Worker('maestro', this.withGuards(this.plannerHandler.bind(this), 'planner'), { ...workerOptions, name: 'planner' });
        this.workers.set('planner', plannerWorker);
        // Scaffolder Agent
        const scaffolderWorker = new bullmq_1.Worker('maestro', this.withGuards(this.scaffolderHandler.bind(this), 'scaffolder'), { ...workerOptions, name: 'scaffolder' });
        this.workers.set('scaffolder', scaffolderWorker);
        // Implementer Agent
        const implementerWorker = new bullmq_1.Worker('maestro', this.withGuards(this.implementerHandler.bind(this), 'implementer'), { ...workerOptions, name: 'implementer' });
        this.workers.set('implementer', implementerWorker);
        // Tester Agent
        const testerWorker = new bullmq_1.Worker('maestro', this.withGuards(this.testerHandler.bind(this), 'tester'), { ...workerOptions, name: 'tester' });
        this.workers.set('tester', testerWorker);
        // Reviewer Agent
        const reviewerWorker = new bullmq_1.Worker('maestro', this.withGuards(this.reviewerHandler.bind(this), 'reviewer'), { ...workerOptions, name: 'reviewer' });
        this.workers.set('reviewer', reviewerWorker);
        // Doc Writer Agent
        const docWriterWorker = new bullmq_1.Worker('maestro', this.withGuards(this.docWriterHandler.bind(this), 'doc-writer'), { ...workerOptions, name: 'doc-writer' });
        this.workers.set('doc-writer', docWriterWorker);
    }
    withGuards(handler, agentName) {
        return async (job) => {
            const tracer = (0, tracer_js_1.getTracer)();
            return tracer.withSpan(`maestro.agent.${agentName}`, async (span) => {
                span.setAttribute('maestro.agent.name', agentName);
                span.setAttribute('maestro.job.id', job.id || 'unknown');
                span.setAttribute('maestro.task.kind', job.data.kind);
                span.setAttribute('maestro.task.repo', job.data.repo);
                const startTime = Date.now();
                const budget = new Budget(job.data.budgetUSD);
                try {
                    // Policy guard
                    const policyResult = await this.policyGuard.checkPolicy(job.data);
                    if (!policyResult.allowed) {
                        throw new Error(`Policy violation: ${policyResult.reason}`);
                    }
                    // Budget guard
                    if (budget.maxUSD <= 0) {
                        throw new Error('Budget exceeded: action blocked by budget guard');
                    }
                    // Wait for dependencies
                    if (job.data.dependencies?.length) {
                        await this.waitForDependencies(job.data.dependencies);
                    }
                    logger_js_1.logger.info('Starting agent task', {
                        taskId: job.id,
                        kind: job.data.kind,
                        budget: budget.maxUSD,
                    });
                    const result = await handler(job);
                    const duration = Date.now() - startTime;
                    // Update task result with guardrail metadata
                    return {
                        ...result,
                        duration,
                        cost: budget.usedUSD,
                    };
                }
                catch (error) {
                    const duration = Date.now() - startTime;
                    const errorMessage = error.message;
                    span.recordException(error);
                    span.setStatus({
                        code: tracer_js_1.SpanStatusCode.ERROR,
                        message: errorMessage,
                    });
                    logger_js_1.logger.error('Agent task failed', {
                        taskId: job.id,
                        error: errorMessage,
                        duration,
                    });
                    return {
                        success: false,
                        duration,
                        cost: budget.usedUSD,
                        errors: [errorMessage],
                    };
                }
            }, { kind: tracer_js_1.SpanKind.CONSUMER });
        };
    }
    async waitForDependencies(dependencies) {
        const tracer = (0, tracer_js_1.getTracer)();
        return tracer.withSpan('maestro.waitForDependencies', async (span) => {
            span.setAttribute('maestro.dependencies.count', dependencies.length);
            // Simple dependency waiting - in production would use more sophisticated coordination
            const maxWait = 300000; // 5 minutes
            const pollInterval = 5000; // 5 seconds
            const startTime = Date.now();
            while (Date.now() - startTime < maxWait) {
                const jobs = await Promise.all(dependencies.map((id) => maestroQueue.getJob(id)));
                const allComplete = jobs.every((job) => job &&
                    (job.finishedOn !== undefined || job.failedReason !== undefined));
                if (allComplete) {
                    return;
                }
                await new Promise((resolve) => setTimeout(resolve, pollInterval));
            }
            throw new Error(`Dependencies not satisfied within ${maxWait}ms`);
        });
    }
    // Agent Handlers
    async plannerHandler(job) {
        const { repo, issue, context } = job.data;
        logger_js_1.logger.info('Planner agent starting', { repo, issue });
        // Mock planning logic - in reality would call LLM with prompt registry
        const plan = {
            tasks: [
                { kind: 'scaffold', description: 'Create boilerplate' },
                { kind: 'implement', description: 'Write code' },
                { kind: 'test', description: 'Add tests' },
                { kind: 'review', description: 'Code review' },
                { kind: 'docs', description: 'Update documentation' },
            ],
            estimate: '2 hours',
            confidence: 0.8,
        };
        return {
            success: true,
            output: plan,
            cost: 0.05, // Mock LLM cost
            duration: 0, // Will be set by guard
            artifacts: [`plan-${job.id}.json`],
        };
    }
    async scaffolderHandler(job) {
        const { repo, context } = job.data;
        logger_js_1.logger.info('Scaffolder agent starting', { repo });
        // Mock scaffolding logic
        const scaffold = {
            branch: `feature/${job.id}`,
            files_created: [
                'src/components/NewComponent.js',
                'src/types/NewTypes.js',
                'tests/NewComponent.test.js',
            ],
        };
        return {
            success: true,
            output: scaffold,
            cost: 0.02,
            duration: 0,
            artifacts: [`scaffold-${job.id}.json`],
        };
    }
    async implementerHandler(job) {
        const { repo, context } = job.data;
        logger_js_1.logger.info('Implementer agent starting', { repo });
        // Mock implementation logic
        const implementation = {
            files_modified: 3,
            lines_added: 150,
            lines_removed: 20,
            test_coverage: 85,
        };
        return {
            success: true,
            output: implementation,
            cost: 0.15,
            duration: 0,
            artifacts: [`implementation-${job.id}.diff`],
        };
    }
    async testerHandler(job) {
        const { repo, context } = job.data;
        logger_js_1.logger.info('Tester agent starting', { repo });
        // Mock testing logic
        const testResults = {
            tests_run: 25,
            tests_passed: 24,
            tests_failed: 1,
            coverage: 87,
            flakes_detected: 0,
        };
        return {
            success: testResults.tests_failed === 0,
            output: testResults,
            cost: 0.03,
            duration: 0,
            artifacts: [`test-results-${job.id}.xml`],
        };
    }
    async reviewerHandler(job) {
        const { repo, context } = job.data;
        logger_js_1.logger.info('Reviewer agent starting', { repo });
        // Mock review logic
        const review = {
            security_issues: 0,
            code_quality_score: 8.5,
            suggestions: 3,
            approved: true,
        };
        return {
            success: true,
            output: review,
            cost: 0.08,
            duration: 0,
            artifacts: [`review-${job.id}.json`],
        };
    }
    async docWriterHandler(job) {
        const { repo, context } = job.data;
        logger_js_1.logger.info('Doc writer agent starting', { repo });
        // Mock documentation logic
        const docs = {
            files_updated: ['README.md', 'CHANGELOG.md'],
            provenance_manifest: true,
            api_docs_generated: true,
        };
        return {
            success: true,
            output: docs,
            cost: 0.04,
            duration: 0,
            artifacts: [`docs-${job.id}.md`, `provenance-${job.id}.json`],
        };
    }
    setupEventHandlers() {
        queueEvents.on('completed', (jobId, result) => {
            logger_js_1.logger.info('Task completed', { taskId: jobId, result });
        });
        queueEvents.on('failed', (jobId, failedReason) => {
            logger_js_1.logger.error('Task failed', { taskId: jobId, reason: failedReason });
        });
        queueEvents.on('stalled', (jobId) => {
            logger_js_1.logger.warn('Task stalled', { taskId: jobId });
        });
    }
    async getTaskStatus(taskId) {
        const job = await maestroQueue.getJob(taskId);
        if (!job)
            return null;
        return {
            id: job.id,
            name: job.name,
            data: job.data,
            progress: job.progress,
            state: await job.getState(),
            finishedOn: job.finishedOn,
            processedOn: job.processedOn,
            failedReason: job.failedReason,
        };
    }
    async shutdown() {
        logger_js_1.logger.info('Shutting down Maestro orchestrator');
        for (const [name, worker] of this.workers) {
            logger_js_1.logger.info(`Closing worker: ${name}`);
            await worker.close();
        }
        await maestroQueue.close();
        await redis.quit();
    }
}
// Singleton instance
exports.maestro = new MaestroOrchestrator();
// Graceful shutdown
process.on('SIGTERM', async () => {
    await exports.maestro.shutdown();
    process.exit(0);
});
process.on('SIGINT', async () => {
    await exports.maestro.shutdown();
    process.exit(0);
});
