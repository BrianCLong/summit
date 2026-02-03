
import { CostEstimator } from '../../packages/finops/agent-cost-estimator/src/index';
import { TrajectoryEvaluator, Trajectory } from '../../packages/eval/trajectory-metrics/src/index';
import { PolicyGate, AgentCharter } from '../../packages/governance/runtime-gates/src/index';
import { EnhancedAutonomousOrchestrator } from '../../server/src/autonomous/orchestrator.enhanced';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { Logger } from 'pino';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

// Mock Dependencies for Orchestrator
const mockDb = {
  query: async () => ({ rows: [] }),
} as unknown as Pool;

const mockRedis = {
  subscribe: () => {},
  on: () => {},
  publish: () => {},
} as unknown as Redis;

const mockLogger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
  child: () => mockLogger,
} as unknown as Logger;

const mockPolicyEngine = {
  evaluate: async () => ({ allowed: true }),
};

async function runExperiments() {
  const outputDir = 'docs/evidence/automation-turn-5';
  await mkdir(outputDir, { recursive: true });

  console.log('--- Experiment 1: Planner With Cost Forecasting ---');
  const costEstimator = new CostEstimator();
  const taskParams = { goal: 'Refactor the entire codebase to Rust' };
  const estimate = costEstimator.estimate('generate_code', taskParams, 'gpt-4');
  console.log('Initial Estimate:', estimate);
  const optimized = costEstimator.optimize(estimate, 0.50); // $0.50 budget
  console.log('Optimized Estimate:', optimized);

  await writeFile(join(outputDir, 'exp1_cost_forecast.json'), JSON.stringify({ estimate, optimized }, null, 2));

  console.log('\n--- Experiment 2: Interruptible Agent Runtime (Simulation) ---');
  // We simulate the PAUSE/RESUME logic since we can't easily spin up the full async loop here
  // But we verify the Orchestrator class accepts the signals
  const orchestrator = new EnhancedAutonomousOrchestrator(mockDb, mockRedis, mockLogger, mockPolicyEngine);
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

  await writeFile(join(outputDir, 'exp2_interruptibility.json'), JSON.stringify({ paused: isPaused, resumed: !isPausedAfter }, null, 2));

  console.log('\n--- Experiment 3: Trajectory Health Dashboard ---');
  const evaluator = new TrajectoryEvaluator();
  const trajectory: Trajectory = {
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

  await writeFile(join(outputDir, 'exp3_trajectory_health.json'), JSON.stringify(health, null, 2));

  console.log('\n--- Experiment 4: Charter-Driven Governance ---');
  const gate = new PolicyGate();
  const charter: AgentCharter = {
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

  await writeFile(join(outputDir, 'exp4_charter_governance.json'), JSON.stringify({ allowed: resultAllowed, blocked: resultBlocked, approval: resultApproval }, null, 2));
}

runExperiments().catch(console.error);
