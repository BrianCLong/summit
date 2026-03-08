"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const orchestrator_enhanced_1 = require("../../src/autonomous/orchestrator.enhanced");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Mock dependencies
const mockDb = {
    query: globals_1.jest.fn().mockResolvedValue({ rows: [] }),
};
const mockRedis = {
    subscribe: globals_1.jest.fn(),
    on: globals_1.jest.fn(),
    publish: globals_1.jest.fn(),
};
const mockLogger = {
    info: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
    child: globals_1.jest.fn().mockReturnThis(),
};
const mockPolicyEngine = {
    evaluate: globals_1.jest.fn().mockResolvedValue({ allowed: true }),
};
// Mock OpenTelemetry
globals_1.jest.mock('@opentelemetry/api', () => ({
    trace: {
        getTracer: () => ({
            startActiveSpan: (name, fn) => {
                const span = {
                    setStatus: globals_1.jest.fn(),
                    setAttributes: globals_1.jest.fn(),
                    end: globals_1.jest.fn()
                };
                return fn(span);
            },
        }),
    },
    context: { active: () => ({}) },
    SpanStatusCode: { OK: 1, ERROR: 2 },
}));
(0, globals_1.describe)('EnhancedAutonomousOrchestrator Governance', () => {
    let orchestrator;
    const evidenceDir = path_1.default.join(process.cwd(), 'evidence', 'traces');
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        orchestrator = new orchestrator_enhanced_1.EnhancedAutonomousOrchestrator(mockDb, mockRedis, mockLogger, mockPolicyEngine);
        // Clear evidence dir
        if (fs_1.default.existsSync(evidenceDir)) {
            fs_1.default.rmSync(evidenceDir, { recursive: true, force: true });
        }
    });
    (0, globals_1.it)('should generate an execution trace artifact upon task completion', async () => {
        // 1. Setup - Register a dummy action
        const dummyAction = {
            name: 'analyze_goal', // Matches default generated task
            version: '1.0.0',
            safety: {
                category: 'read',
                budgets: { timeMs: 100, network: 'none' }
            },
            validate: async () => ({ success: true, data: {} }),
            plan: async () => ({ steps: [] }),
            apply: async () => ({ result: 'success' })
        };
        orchestrator.registerAction(dummyAction);
        // 2. Setup - Mock DB responses to simulate task lifecycle
        // getRun response
        mockDb.query.mockResolvedValueOnce({ rows: [{
                    id: 'run-1',
                    goal: 'test',
                    autonomy: 1,
                    created_by: 'user',
                    tenant_id: 'tenant',
                    mode: 'APPLY'
                }] });
        // 3. Invoke - Execute a task directly (to avoid complex async flow of createRun)
        const task = {
            id: 'task-1',
            runId: 'run-1',
            type: 'analyze_goal',
            params: {},
            dependencies: [],
            safetyCategory: 'read',
            requiresApproval: false,
            idempotencyKey: 'key'
        };
        // Mock idempotency check (empty result = not done)
        mockDb.query.mockResolvedValueOnce({ rows: [] });
        await orchestrator.executeTask(task, 'correlation-1');
        // 4. Verify - Check file system for trace
        const files = fs_1.default.readdirSync(evidenceDir);
        (0, globals_1.expect)(files.length).toBe(1);
        const traceContent = JSON.parse(fs_1.default.readFileSync(path_1.default.join(evidenceDir, files[0]), 'utf-8'));
        (0, globals_1.expect)(traceContent.taskId).toBe('task-1');
        (0, globals_1.expect)(traceContent.result.output).toEqual({ result: 'success' });
        (0, globals_1.expect)(traceContent.compliance_tags).toContain('traceability');
    });
});
