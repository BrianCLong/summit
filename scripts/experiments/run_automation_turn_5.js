"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../packages/finops/agent-cost-estimator/src/index");
const index_2 = require("../../packages/eval/trajectory-metrics/src/index");
const index_3 = require("../../packages/governance/runtime-gates/src/index");
const orchestrator_enhanced_1 = require("../../server/src/autonomous/orchestrator.enhanced");
const promises_1 = require("fs/promises");
const path_1 = require("path");
// Mock Dependencies for Orchestrator
const mockDb = {
    query: async () => ({ rows: [] }),
};
const mockRedis = {
    subscribe: () => { },
    on: () => { },
    publish: () => { },
};
const mockLogger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    child: () => mockLogger,
};
const mockPolicyEngine = {
    evaluate: async () => ({ allowed: true }),
};
async function runExperiments() {
    const outputDir = 'docs/evidence/automation-turn-5';
    await (0, promises_1.mkdir)(outputDir, { recursive: true });
    console.log('--- Experiment 1: Planner With Cost Forecasting ---');
    const costEstimator = new index_1.CostEstimator();
    const taskParams = { goal: 'Refactor the entire codebase to Rust' };
    const estimate = costEstimator.estimate('generate_code', taskParams, 'gpt-4');
    console.log('Initial Estimate:', estimate);
    const optimized = costEstimator.optimize(estimate, 0.50); // $0.50 budget
    console.log('Optimized Estimate:', optimized);
    await (0, promises_1.writeFile)((0, path_1.join)(outputDir, 'exp1_cost_forecast.json'), JSON.stringify({ estimate, optimized }, null, 2));
    console.log('\n--- Experiment 2: Interruptible Agent Runtime (Simulation) ---');
    // We simulate the PAUSE/RESUME logic since we can't easily spin up the full async loop here
    // But we verify the Orchestrator class accepts the signals
    const orchestrator = new orchestrator_enhanced_1.EnhancedAutonomousOrchestrator(mockDb, mockRedis, mockLogger, mockPolicyEngine);
    // Simulate receiving a pause message
    // @ts-ignore - accessing private/protected for test simulation or via public method
    await orchestrator['handleControlMessage']('orchestrator:pause', 'run-123');
    // @ts-ignore
    const isPaused = orchestrator['pausedRuns'].has('run-123');
    console.log('Run paused state:', isPaused);
    // Simulate receiving resume
    // @ts-ignore
    await orchestrator['handleControlMessage']('orchestrator:resume', 'run-123');
    // @ts-ignore
    const isPausedAfter = orchestrator['pausedRuns'].has('run-123');
    console.log('Run paused state after resume:', isPausedAfter);
    await (0, promises_1.writeFile)((0, path_1.join)(outputDir, 'exp2_interruptibility.json'), JSON.stringify({ paused: isPaused, resumed: !isPausedAfter }, null, 2));
    console.log('\n--- Experiment 3: Trajectory Health Dashboard ---');
    const evaluator = new index_2.TrajectoryEvaluator();
    const trajectory = {
        runId: 'traj-1',
        steps: [
            { id: '1', type: 'search', status: 'succeeded', timestamp: 1000 },
            { id: '2', type: 'search', status: 'succeeded', timestamp: 2000 }, // Oscillation potentially
            { id: '3', type: 'read', status: 'failed', timestamp: 3000 },
            { id: '4', type: 'read', status: 'succeeded', timestamp: 4000 }, // Recovery
        ],
        finalStatus: 'succeeded',
        startTime: 1000,
        endTime: 5000
    };
    const health = evaluator.evaluate(trajectory);
    console.log('Trajectory Health:', health);
    await (0, promises_1.writeFile)((0, path_1.join)(outputDir, 'exp3_trajectory_health.json'), JSON.stringify(health, null, 2));
    console.log('\n--- Experiment 4: Charter-Driven Governance ---');
    const gate = new index_3.PolicyGate();
    const charter = {
        agentId: 'agent-007',
        name: 'Bond',
        version: '1.0.0',
        authority: {
            scopes: ['read'],
            maxBudgetUSD: 10.0,
            maxTokensPerRun: 10000,
            expiryDate: new Date(Date.now() + 86400000).toISOString()
        },
        gates: {
            requireHumanApprovalFor: ['deploy'],
            allowedTools: ['search', 'read', 'analyze']
        },
        ownerSignature: 'sig-123'
    };
    const resultAllowed = gate.validate(charter, 'search', {}, 5.0);
    console.log('Action "search" allowed:', resultAllowed);
    const resultBlocked = gate.validate(charter, 'nuke_database', {}, 5.0);
    console.log('Action "nuke_database" allowed:', resultBlocked);
    const resultApproval = gate.validate(charter, 'deploy', {}, 5.0);
    console.log('Action "deploy" allowed:', resultApproval);
    await (0, promises_1.writeFile)((0, path_1.join)(outputDir, 'exp4_charter_governance.json'), JSON.stringify({ allowed: resultAllowed, blocked: resultBlocked, approval: resultApproval }, null, 2));
}
runExperiments().catch(console.error);
