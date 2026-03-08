"use strict";
/**
 * Distributed Queue Test Suite
 *
 * Comprehensive tests for the distributed queue system including:
 * - Redis cluster client with failover
 * - Distributed queue operations
 * - Agent fleet notifications
 * - Air-gapped failover
 * - Codex task orchestration
 * - E2E testing hooks
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock Redis/ioredis
const mockRedisClient = {
    ping: globals_1.jest.fn().mockResolvedValue('PONG'),
    quit: globals_1.jest.fn().mockResolvedValue(undefined),
    disconnect: globals_1.jest.fn(),
    on: globals_1.jest.fn(),
    subscribe: globals_1.jest.fn().mockResolvedValue(undefined),
    unsubscribe: globals_1.jest.fn().mockResolvedValue(undefined),
    publish: globals_1.jest.fn().mockResolvedValue(1),
    hset: globals_1.jest.fn().mockResolvedValue(1),
    hget: globals_1.jest.fn().mockResolvedValue(null),
    get: globals_1.jest.fn().mockResolvedValue(null),
    set: globals_1.jest.fn().mockResolvedValue('OK'),
    setex: globals_1.jest.fn().mockResolvedValue('OK'),
    del: globals_1.jest.fn().mockResolvedValue(1),
};
globals_1.jest.mock('ioredis', () => {
    return {
        default: globals_1.jest.fn().mockImplementation(() => mockRedisClient),
        __esModule: true,
    };
});
// Mock BullMQ
globals_1.jest.mock('bullmq', () => ({
    Queue: globals_1.jest.fn().mockImplementation((name) => ({
        name,
        add: globals_1.jest.fn().mockResolvedValue({ id: 'job-1', name: 'test-job', data: {} }),
        addBulk: globals_1.jest.fn().mockResolvedValue([{ id: 'job-1' }, { id: 'job-2' }]),
        getJob: globals_1.jest.fn().mockResolvedValue(null),
        getJobs: globals_1.jest.fn().mockResolvedValue([]),
        getJobCounts: globals_1.jest.fn().mockResolvedValue({
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
            paused: 0,
        }),
        pause: globals_1.jest.fn().mockResolvedValue(undefined),
        resume: globals_1.jest.fn().mockResolvedValue(undefined),
        close: globals_1.jest.fn().mockResolvedValue(undefined),
    })),
    Worker: globals_1.jest.fn().mockImplementation((name, processor, opts) => ({
        name,
        on: globals_1.jest.fn(),
        close: globals_1.jest.fn().mockResolvedValue(undefined),
    })),
    QueueEvents: globals_1.jest.fn().mockImplementation((name) => ({
        name,
        on: globals_1.jest.fn(),
        close: globals_1.jest.fn().mockResolvedValue(undefined),
    })),
    FlowProducer: globals_1.jest.fn().mockImplementation(() => ({
        close: globals_1.jest.fn().mockResolvedValue(undefined),
    })),
    Job: globals_1.jest.fn(),
}));
// Import after mocks
const index_js_1 = require("../distributed/index.js");
(0, globals_1.describe)('RedisClusterClient', () => {
    let client;
    const config = {
        nodes: [
            { host: 'localhost', port: 6379, role: 'primary' },
            { host: 'localhost', port: 6380, role: 'replica' },
        ],
        poolSize: 5,
        minPoolSize: 2,
        maxPoolSize: 10,
        healthCheckInterval: 1000,
    };
    (0, globals_1.beforeEach)(() => {
        client = new index_js_1.RedisClusterClient(config);
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.afterEach)(async () => {
        await client.shutdown();
    });
    (0, globals_1.describe)('initialization', () => {
        (0, globals_1.it)('should create client with provided config', () => {
            (0, globals_1.expect)(client).toBeDefined();
            (0, globals_1.expect)(client.getActiveNode()).toBeNull();
        });
        (0, globals_1.it)('should have correct default config values', () => {
            const minimalClient = new index_js_1.RedisClusterClient({
                nodes: [{ host: 'localhost', port: 6379, role: 'primary' }],
            });
            (0, globals_1.expect)(minimalClient).toBeDefined();
        });
    });
    (0, globals_1.describe)('getPoolStats', () => {
        (0, globals_1.it)('should return pool statistics', () => {
            const stats = client.getPoolStats();
            (0, globals_1.expect)(stats).toHaveProperty('total');
            (0, globals_1.expect)(stats).toHaveProperty('active');
            (0, globals_1.expect)(stats).toHaveProperty('idle');
            (0, globals_1.expect)(stats).toHaveProperty('waiting');
            (0, globals_1.expect)(stats).toHaveProperty('healthyNodes');
            (0, globals_1.expect)(stats).toHaveProperty('unhealthyNodes');
        });
    });
    (0, globals_1.describe)('getNodeHealthStatus', () => {
        (0, globals_1.it)('should return health status for all nodes', () => {
            const health = client.getNodeHealthStatus();
            (0, globals_1.expect)(health.size).toBe(config.nodes.length);
        });
    });
    (0, globals_1.describe)('getFailoverHistory', () => {
        (0, globals_1.it)('should return empty history initially', () => {
            const history = client.getFailoverHistory();
            (0, globals_1.expect)(history).toEqual([]);
        });
    });
    (0, globals_1.describe)('isAirgapped', () => {
        (0, globals_1.it)('should return false when not in airgap mode', () => {
            (0, globals_1.expect)(client.isAirgapped()).toBe(false);
        });
    });
});
(0, globals_1.describe)('DistributedPriority', () => {
    (0, globals_1.it)('should have correct priority values', () => {
        (0, globals_1.expect)(index_js_1.DistributedPriority.CRITICAL).toBe(1);
        (0, globals_1.expect)(index_js_1.DistributedPriority.URGENT).toBe(2);
        (0, globals_1.expect)(index_js_1.DistributedPriority.HIGH).toBe(3);
        (0, globals_1.expect)(index_js_1.DistributedPriority.NORMAL).toBe(5);
        (0, globals_1.expect)(index_js_1.DistributedPriority.LOW).toBe(7);
        (0, globals_1.expect)(index_js_1.DistributedPriority.BACKGROUND).toBe(10);
    });
    (0, globals_1.it)('should have CRITICAL as highest priority', () => {
        (0, globals_1.expect)(index_js_1.DistributedPriority.CRITICAL).toBeLessThan(index_js_1.DistributedPriority.HIGH);
        (0, globals_1.expect)(index_js_1.DistributedPriority.HIGH).toBeLessThan(index_js_1.DistributedPriority.NORMAL);
        (0, globals_1.expect)(index_js_1.DistributedPriority.NORMAL).toBeLessThan(index_js_1.DistributedPriority.LOW);
        (0, globals_1.expect)(index_js_1.DistributedPriority.LOW).toBeLessThan(index_js_1.DistributedPriority.BACKGROUND);
    });
});
(0, globals_1.describe)('AgentFleetNotifier', () => {
    // Import dynamically to avoid issues with mocks
    let AgentFleetNotifier;
    let notifier;
    let mockRedisClusterClient;
    (0, globals_1.beforeEach)(async () => {
        const module = await Promise.resolve().then(() => __importStar(require('../notifications/index.js')));
        AgentFleetNotifier = module.AgentFleetNotifier;
        mockRedisClusterClient = {
            acquire: globals_1.jest.fn().mockResolvedValue(mockRedisClient),
            release: globals_1.jest.fn(),
        };
        notifier = new AgentFleetNotifier(mockRedisClusterClient, {
            heartbeatInterval: 1000,
            heartbeatTimeout: 3000,
        });
    });
    (0, globals_1.afterEach)(async () => {
        await notifier.stop();
    });
    (0, globals_1.describe)('agent management', () => {
        (0, globals_1.it)('should register an agent', async () => {
            await notifier.start();
            const agent = await notifier.registerAgent({
                id: 'agent-1',
                fleetId: 'fleet-1',
                name: 'Test Agent',
                status: 'online',
                capabilities: ['task-processing'],
                maxConcurrency: 10,
                currentLoad: 0,
            });
            (0, globals_1.expect)(agent.id).toBe('agent-1');
            (0, globals_1.expect)(agent.fleetId).toBe('fleet-1');
            (0, globals_1.expect)(agent.lastHeartbeat).toBeDefined();
        });
        (0, globals_1.it)('should get agent info', async () => {
            await notifier.start();
            await notifier.registerAgent({
                id: 'agent-2',
                fleetId: 'fleet-1',
                name: 'Test Agent 2',
                status: 'online',
                capabilities: [],
                maxConcurrency: 5,
                currentLoad: 0,
            });
            const agent = notifier.getAgent('agent-2');
            (0, globals_1.expect)(agent).toBeDefined();
            (0, globals_1.expect)(agent?.name).toBe('Test Agent 2');
        });
        (0, globals_1.it)('should return undefined for non-existent agent', () => {
            const agent = notifier.getAgent('non-existent');
            (0, globals_1.expect)(agent).toBeUndefined();
        });
    });
    (0, globals_1.describe)('fleet management', () => {
        (0, globals_1.it)('should get all fleets', async () => {
            await notifier.start();
            await notifier.registerAgent({
                id: 'agent-3',
                fleetId: 'fleet-2',
                name: 'Test Agent 3',
                status: 'online',
                capabilities: [],
                maxConcurrency: 5,
                currentLoad: 0,
            });
            const fleets = notifier.getFleets();
            (0, globals_1.expect)(fleets.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should calculate fleet health', async () => {
            await notifier.start();
            await notifier.registerAgent({
                id: 'agent-4',
                fleetId: 'fleet-3',
                name: 'Test Agent 4',
                status: 'online',
                capabilities: [],
                maxConcurrency: 10,
                currentLoad: 5,
            });
            const health = notifier.calculateFleetHealth('fleet-3');
            (0, globals_1.expect)(health).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(health).toBeLessThanOrEqual(100);
        });
    });
});
(0, globals_1.describe)('CodexTaskOrchestrator', () => {
    let CodexTaskOrchestrator;
    let orchestrator;
    let mockDistributedQueue;
    (0, globals_1.beforeEach)(async () => {
        const module = await Promise.resolve().then(() => __importStar(require('../orchestration/index.js')));
        CodexTaskOrchestrator = module.CodexTaskOrchestrator;
        mockDistributedQueue = {
            addJob: globals_1.jest.fn().mockResolvedValue({
                id: 'job-1',
                name: 'codex-task',
                status: 'waiting',
            }),
            getJob: globals_1.jest.fn().mockResolvedValue(null),
            on: globals_1.jest.fn(),
        };
        orchestrator = new CodexTaskOrchestrator(mockDistributedQueue, {
            defaultMaxParallel: 3,
            defaultTimeout: 5000,
            rateLimitMax: 10,
            rateLimitWindow: 1000,
        });
    });
    (0, globals_1.describe)('task submission', () => {
        (0, globals_1.it)('should submit a task', async () => {
            const task = await orchestrator.submitTask('code-generation', { prompt: 'Generate a hello world function' }, { model: 'gpt-4' });
            (0, globals_1.expect)(task).toBeDefined();
            (0, globals_1.expect)(task.id).toBeDefined();
            (0, globals_1.expect)(task.type).toBe('code-generation');
            (0, globals_1.expect)(task.status).toBe('queued');
        });
        (0, globals_1.it)('should submit a batch of tasks', async () => {
            const batch = await orchestrator.submitBatch([
                { type: 'code-generation', input: { prompt: 'Task 1' } },
                { type: 'code-review', input: { prompt: 'Task 2' } },
            ]);
            (0, globals_1.expect)(batch).toBeDefined();
            (0, globals_1.expect)(batch.id).toBeDefined();
            (0, globals_1.expect)(batch.tasks.length).toBe(2);
        });
    });
    (0, globals_1.describe)('statistics', () => {
        (0, globals_1.it)('should return orchestrator stats', () => {
            const stats = orchestrator.getStats();
            (0, globals_1.expect)(stats).toHaveProperty('activeTasks');
            (0, globals_1.expect)(stats).toHaveProperty('completedTasks');
            (0, globals_1.expect)(stats).toHaveProperty('failedTasks');
            (0, globals_1.expect)(stats).toHaveProperty('totalBatches');
            (0, globals_1.expect)(stats).toHaveProperty('tokenUsage');
            (0, globals_1.expect)(stats).toHaveProperty('rateLimitRemaining');
        });
        (0, globals_1.it)('should track token usage', () => {
            const usage = orchestrator.getTokenUsage();
            (0, globals_1.expect)(usage).toHaveProperty('used');
            (0, globals_1.expect)(usage).toHaveProperty('budget');
            (0, globals_1.expect)(usage).toHaveProperty('remaining');
            (0, globals_1.expect)(usage).toHaveProperty('estimatedCost');
        });
        (0, globals_1.it)('should reset token usage', () => {
            orchestrator.resetTokenUsage();
            const usage = orchestrator.getTokenUsage();
            (0, globals_1.expect)(usage.used).toBe(0);
        });
    });
});
(0, globals_1.describe)('E2ETestingHooks', () => {
    let E2ETestingHooks;
    let hooks;
    (0, globals_1.beforeEach)(async () => {
        const module = await Promise.resolve().then(() => __importStar(require('../e2e/index.js')));
        E2ETestingHooks = module.E2ETestingHooks;
        hooks = new E2ETestingHooks({
            enabled: true,
            latencySimulation: { min: 10, max: 100, distribution: 'uniform' },
            errorInjection: { rate: 0.1, types: ['timeout', 'network'] },
        });
    });
    (0, globals_1.describe)('test suite management', () => {
        (0, globals_1.it)('should create a test suite', () => {
            const suite = hooks.createSuite('Integration Tests');
            (0, globals_1.expect)(suite).toBeDefined();
            (0, globals_1.expect)(suite.id).toBeDefined();
            (0, globals_1.expect)(suite.name).toBe('Integration Tests');
            (0, globals_1.expect)(suite.status).toBe('pending');
        });
        (0, globals_1.it)('should add tests to a suite', () => {
            const suite = hooks.createSuite('Test Suite');
            const test = hooks.addTest(suite.id, 'should pass', async () => { });
            (0, globals_1.expect)(test).toBeDefined();
            (0, globals_1.expect)(test.name).toBe('should pass');
            (0, globals_1.expect)(test.status).toBe('pending');
        });
        (0, globals_1.it)('should run a test suite', async () => {
            const suite = hooks.createSuite('Runnable Suite');
            hooks.addTest(suite.id, 'passing test', async () => {
                // Test passes
            });
            const result = await hooks.runSuite(suite.id);
            (0, globals_1.expect)(result.status).toBe('passed');
            (0, globals_1.expect)(result.tests[0].status).toBe('passed');
        });
        (0, globals_1.it)('should handle failing tests', async () => {
            const suite = hooks.createSuite('Failing Suite');
            hooks.addTest(suite.id, 'failing test', async () => {
                throw new Error('Test failed');
            });
            const result = await hooks.runSuite(suite.id);
            (0, globals_1.expect)(result.status).toBe('failed');
            (0, globals_1.expect)(result.tests[0].status).toBe('failed');
            (0, globals_1.expect)(result.tests[0].error).toBeDefined();
        });
    });
    (0, globals_1.describe)('job capture', () => {
        (0, globals_1.it)('should capture jobs', () => {
            const mockJob = {
                id: 'captured-job-1',
                name: 'test',
                status: 'completed',
                partition: 'default',
            };
            hooks.captureJob(mockJob);
            const captured = hooks.getCapturedJobs();
            (0, globals_1.expect)(captured.length).toBe(1);
            (0, globals_1.expect)(captured[0].id).toBe('captured-job-1');
        });
        (0, globals_1.it)('should filter captured jobs', () => {
            hooks.captureJob({ id: '1', name: 'type-a', status: 'completed' });
            hooks.captureJob({ id: '2', name: 'type-b', status: 'failed' });
            hooks.captureJob({ id: '3', name: 'type-a', status: 'completed' });
            const typeAJobs = hooks.getCapturedJobs({ name: 'type-a' });
            const failedJobs = hooks.getCapturedJobs({ status: 'failed' });
            (0, globals_1.expect)(typeAJobs.length).toBe(2);
            (0, globals_1.expect)(failedJobs.length).toBe(1);
        });
        (0, globals_1.it)('should clear captured jobs', () => {
            hooks.captureJob({ id: '1' });
            hooks.clearCapturedJobs();
            (0, globals_1.expect)(hooks.getCapturedJobs().length).toBe(0);
        });
    });
    (0, globals_1.describe)('assertions', () => {
        (0, globals_1.it)('should assert job completed', () => {
            hooks.captureJob({ id: 'job-1', status: 'completed' });
            const assertion = hooks.assertJobCompleted('job-1');
            (0, globals_1.expect)(assertion.passed).toBe(true);
        });
        (0, globals_1.it)('should fail assertion for non-completed job', () => {
            hooks.captureJob({ id: 'job-2', status: 'failed' });
            const assertion = hooks.assertJobCompleted('job-2');
            (0, globals_1.expect)(assertion.passed).toBe(false);
        });
        (0, globals_1.it)('should assert job count', () => {
            hooks.captureJob({ id: '1' });
            hooks.captureJob({ id: '2' });
            const assertion = hooks.assertJobCount(2);
            (0, globals_1.expect)(assertion.passed).toBe(true);
        });
    });
    (0, globals_1.describe)('event capture', () => {
        (0, globals_1.it)('should capture events', () => {
            hooks.captureEvent('test:event', { key: 'value' });
            const events = hooks.getCapturedEvents();
            (0, globals_1.expect)(events.length).toBe(1);
            (0, globals_1.expect)(events[0].type).toBe('test:event');
            (0, globals_1.expect)(events[0].data.key).toBe('value');
        });
        (0, globals_1.it)('should filter events by type', () => {
            hooks.captureEvent('type-a', {});
            hooks.captureEvent('type-b', {});
            hooks.captureEvent('type-a', {});
            const typeAEvents = hooks.getCapturedEvents('type-a');
            (0, globals_1.expect)(typeAEvents.length).toBe(2);
        });
    });
    (0, globals_1.describe)('metrics', () => {
        (0, globals_1.it)('should return test metrics', () => {
            const metrics = hooks.getMetrics();
            (0, globals_1.expect)(metrics).toHaveProperty('jobsProcessed');
            (0, globals_1.expect)(metrics).toHaveProperty('avgLatency');
            (0, globals_1.expect)(metrics).toHaveProperty('errorRate');
            (0, globals_1.expect)(metrics).toHaveProperty('throughput');
            (0, globals_1.expect)(metrics).toHaveProperty('failoverCount');
        });
    });
    (0, globals_1.describe)('reset', () => {
        (0, globals_1.it)('should reset all state', () => {
            hooks.captureJob({ id: '1' });
            hooks.captureEvent('test', {});
            hooks.setMockResponse('job-1', { result: 'mocked' });
            hooks.reset();
            (0, globals_1.expect)(hooks.getCapturedJobs().length).toBe(0);
            (0, globals_1.expect)(hooks.getCapturedEvents().length).toBe(0);
            (0, globals_1.expect)(hooks.getMockResponse('job-1')).toBeUndefined();
        });
    });
});
(0, globals_1.describe)('AirgapFailoverOrchestrator', () => {
    let AirgapFailoverOrchestrator;
    let orchestrator;
    let mockRedisClusterClient;
    (0, globals_1.beforeEach)(async () => {
        const module = await Promise.resolve().then(() => __importStar(require('../distributed/index.js')));
        AirgapFailoverOrchestrator = module.AirgapFailoverOrchestrator;
        mockRedisClusterClient = {
            execute: globals_1.jest.fn().mockResolvedValue('PONG'),
            acquire: globals_1.jest.fn().mockResolvedValue(mockRedisClient),
            release: globals_1.jest.fn(),
        };
        orchestrator = new AirgapFailoverOrchestrator(mockRedisClusterClient, {
            enabled: true,
            localStoragePath: '/tmp/test-airgap',
            maxLocalQueueSize: 100,
            syncBatchSize: 10,
        });
    });
    (0, globals_1.describe)('status', () => {
        (0, globals_1.it)('should return current status', () => {
            const status = orchestrator.getStatus();
            (0, globals_1.expect)(status).toHaveProperty('state');
            (0, globals_1.expect)(status).toHaveProperty('pendingJobs');
            (0, globals_1.expect)(status).toHaveProperty('localQueueSize');
        });
        (0, globals_1.it)('should start in connected state', () => {
            const status = orchestrator.getStatus();
            (0, globals_1.expect)(status.state).toBe('connected');
        });
    });
    (0, globals_1.describe)('local queue stats', () => {
        (0, globals_1.it)('should return local queue statistics', () => {
            const stats = orchestrator.getLocalQueueStats();
            (0, globals_1.expect)(stats).toHaveProperty('totalJobs');
            (0, globals_1.expect)(stats).toHaveProperty('pendingSync');
            (0, globals_1.expect)(stats).toHaveProperty('syncedJobs');
            (0, globals_1.expect)(stats).toHaveProperty('oldestJob');
        });
    });
});
