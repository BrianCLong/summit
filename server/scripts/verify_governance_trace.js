"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const orchestrator_enhanced_1 = require("../src/autonomous/orchestrator.enhanced");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const assert_1 = __importDefault(require("assert"));
// Mocks
const mockDb = {
    query: async () => ({ rows: [] }),
};
const mockRedis = {
    subscribe: () => { },
    on: () => { },
    publish: () => { },
};
const mockLogger = {
    info: () => { },
    error: () => { },
    warn: () => { },
    debug: () => { },
    child: () => mockLogger,
};
const mockPolicyEngine = {
    evaluate: async () => ({ allowed: true }),
};
// Main Verification Function
async function verify() {
    console.log('Starting Governance Trace Verification...');
    const evidenceDir = path_1.default.join(process.cwd(), 'evidence', 'traces');
    // Clean evidence dir
    if (fs_1.default.existsSync(evidenceDir)) {
        fs_1.default.rmSync(evidenceDir, { recursive: true, force: true });
    }
    const orchestrator = new orchestrator_enhanced_1.EnhancedAutonomousOrchestrator(mockDb, mockRedis, mockLogger, mockPolicyEngine);
    // Register dummy action
    orchestrator.registerAction({
        name: 'analyze_goal',
        version: '1.0.0',
        safety: { category: 'read', budgets: { timeMs: 100, network: 'none' } },
        validate: async () => ({ success: true, data: {} }),
        plan: async () => ({ steps: [] }),
        apply: async () => ({ result: 'success' })
    });
    // Mock DB for execution flow
    mockDb.query = async (sql) => {
        if (typeof sql === 'string' && sql.includes('SELECT * FROM runs')) {
            return { rows: [{
                        id: 'run-1',
                        goal: 'test',
                        autonomy: 1,
                        created_by: 'user',
                        tenant_id: 'tenant',
                        mode: 'APPLY'
                    }] };
        }
        return { rows: [] };
    };
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
    try {
        // Access private method or simulate execution
        // Since executeTask is private, we can use 'any' casting
        await orchestrator.executeTask(task, 'correlation-1');
    }
    catch (e) {
        console.error('Execution failed:', e);
    }
    // Check for trace file
    if (!fs_1.default.existsSync(evidenceDir)) {
        throw new Error('Evidence directory not created');
    }
    const files = fs_1.default.readdirSync(evidenceDir);
    console.log(`Found ${files.length} trace files.`);
    if (files.length === 0) {
        throw new Error('No trace file generated');
    }
    const traceContent = JSON.parse(fs_1.default.readFileSync(path_1.default.join(evidenceDir, files[0]), 'utf-8'));
    assert_1.default.strictEqual(traceContent.taskId, 'task-1', 'Task ID mismatch');
    assert_1.default.strictEqual(traceContent.result.output.result, 'success', 'Output mismatch');
    assert_1.default.ok(traceContent.compliance_tags.includes('traceability'), 'Missing compliance tag');
    console.log('✅ Governance Trace Verification Passed!');
}
verify().catch(err => {
    console.error('❌ Verification Failed:', err);
    process.exit(1);
});
