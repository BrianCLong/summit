"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const AgentOrchestrator_js_1 = require("../AgentOrchestrator.js");
const AgentLifecycleManager_js_1 = require("../AgentLifecycleManager.js");
const persistence_js_1 = require("../persistence.js");
(0, globals_1.describe)('AgentOrchestrator System', () => {
    let orchestrator;
    let lifecycleManager;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.useFakeTimers();
        orchestrator = AgentOrchestrator_js_1.AgentOrchestrator.getInstance();
        lifecycleManager = AgentLifecycleManager_js_1.AgentLifecycleManager.getInstance();
        // Clear state
        lifecycleManager.agents.clear();
        // Reset persistence
        orchestrator.persistence = new persistence_js_1.InMemoryPersistence();
        orchestrator.policyEngine.evaluate = globals_1.jest.fn(async () => ({
            allowed: true,
            reason: 'Allowed',
        }));
    });
    (0, globals_1.afterEach)(() => {
        orchestrator.shutdown();
        lifecycleManager.shutdown();
        globals_1.jest.clearAllTimers();
        globals_1.jest.useRealTimers();
    });
    (0, globals_1.it)('should register an agent', () => {
        const agent = lifecycleManager.registerAgent({
            id: 'agent-1',
            name: 'Test Agent',
            role: 'worker',
            capabilities: [{ name: 'coding', version: '1.0' }],
            version: '1.0.0'
        });
        (0, globals_1.expect)(agent).toBeDefined();
        (0, globals_1.expect)(lifecycleManager.getAgent('agent-1')).toBeDefined();
    });
    (0, globals_1.it)('should route a task to a capable agent', async () => {
        // Register agent
        lifecycleManager.registerAgent({
            id: 'coder-1',
            name: 'Coder',
            role: 'dev',
            capabilities: [{ name: 'typescript', version: '1.0' }],
            version: '1.0'
        });
        // Create task
        const taskId = await orchestrator.submitTask({
            title: 'Write Code',
            description: 'Write some TS',
            priority: 'high',
            input: {},
            requiredCapabilities: ['typescript']
        });
        // Manually trigger processing
        await orchestrator.processQueue();
        const task = await orchestrator.persistence.getTask(taskId);
        (0, globals_1.expect)(task?.status).toBe('assigned');
        (0, globals_1.expect)(task?.assignedTo).toBe('coder-1');
    });
    (0, globals_1.it)('should not route task if no agent has capability', async () => {
        // Register agent
        lifecycleManager.registerAgent({
            id: 'writer-1',
            name: 'Writer',
            role: 'writer',
            capabilities: [{ name: 'english', version: '1.0' }],
            version: '1.0'
        });
        // Create task requiring different capability
        const taskId = await orchestrator.submitTask({
            title: 'Write Code',
            description: 'Write some TS',
            priority: 'high',
            input: {},
            requiredCapabilities: ['typescript']
        });
        await orchestrator.processQueue();
        const task = await orchestrator.persistence.getTask(taskId);
        (0, globals_1.expect)(task?.status).toBe('pending');
        (0, globals_1.expect)(task?.assignedTo).toBeUndefined();
    });
});
