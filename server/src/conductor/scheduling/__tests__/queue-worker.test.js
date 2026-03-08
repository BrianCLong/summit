"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const queue_worker_js_1 = require("../queue-worker.js");
const cost_aware_scheduler_js_1 = require("../cost-aware-scheduler.js");
const prometheus_js_1 = require("../../observability/prometheus.js");
globals_1.jest.mock('../cost-aware-scheduler', () => ({
    costAwareScheduler: {
        getNextTask: globals_1.jest.fn(),
        completeTask: globals_1.jest.fn().mockResolvedValue(undefined),
        failTask: globals_1.jest.fn().mockResolvedValue(undefined),
    },
}));
globals_1.jest.mock('../../observability/prometheus', () => ({
    prometheusConductorMetrics: {
        recordOperationalEvent: globals_1.jest.fn(),
        recordOperationalMetric: globals_1.jest.fn(),
        recordScheduledTask: globals_1.jest.fn(),
        observeScheduledTaskLatency: globals_1.jest.fn(),
    },
}));
const mockCompleteTask = cost_aware_scheduler_js_1.costAwareScheduler.completeTask;
const mockFailTask = cost_aware_scheduler_js_1.costAwareScheduler.failTask;
const mockRecordOperationalEvent = prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent;
const mockRecordOperationalMetric = prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric;
describe('queue-worker pool labeling', () => {
    const config = {
        workerId: 'worker-1',
        expertType: 'light',
        queueNames: ['light_normal'],
        concurrency: 1,
        pollInterval: 0,
        maxRetries: 1,
        shutdownTimeout: 1000,
    };
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
    });
    it('uses unknown pool label when poolId is absent', async () => {
        const worker = new queue_worker_js_1.QueueWorker(config);
        worker.executeTask = globals_1.jest.fn().mockResolvedValue({
            success: true,
            actualCost: 0.5,
            processingTime: 25,
        });
        await worker.processTask('worker-1', 'light_normal', {
            expertType: 'general_llm',
            priority: 'normal',
            estimatedCost: 0.01,
            estimatedDuration: 1000,
            tenantId: 'tenant-1',
            requestId: 'req-1',
            timeout: 1000,
        });
        expect(mockCompleteTask).toHaveBeenCalled();
        expect(mockRecordOperationalEvent).toHaveBeenCalledWith('worker_task_completed', { success: true });
        expect(mockRecordOperationalMetric).toHaveBeenCalledWith('worker_task_success_rate', 1);
    });
    it('tags metrics with provided poolId', async () => {
        const worker = new queue_worker_js_1.QueueWorker(config);
        worker.executeTask = globals_1.jest.fn().mockResolvedValue({
            success: false,
            error: 'boom',
            actualCost: 0,
            processingTime: 10,
        });
        await worker.processTask('worker-1', 'light_normal', {
            expertType: 'general_llm',
            priority: 'normal',
            estimatedCost: 0.01,
            estimatedDuration: 1000,
            tenantId: 'tenant-2',
            requestId: 'req-2',
            timeout: 1000,
            poolId: 'pool-123',
            poolPriceUsd: 0.12,
        });
        expect(mockFailTask).toHaveBeenCalled();
        expect(mockRecordOperationalEvent).toHaveBeenCalledWith('worker_task_failed', { success: false });
        expect(mockRecordOperationalMetric).toHaveBeenCalledWith('worker_task_success_rate', 0);
    });
});
