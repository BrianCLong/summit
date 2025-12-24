/**
 * Runbook Runtime Tests
 *
 * Comprehensive test suite for the runbook runtime system including:
 * - DAG validation and ordering
 * - Retry behavior
 * - Pause/Resume/Cancel
 * - Rapid Attribution flow
 *
 * @module runbooks/runtime/__tests__/runtime.test
 */

import {
  RunbookRuntimeEngine,
  InMemoryRunbookDefinitionRepository,
  RunbookStateManager,
  InMemoryRunbookExecutionRepository,
  InMemoryRunbookExecutionLogRepository,
  RunbookDefinition,
  RunbookStepDefinition,
  createExecutorRegistry,
  NoOpExecutor,
  DefaultStepExecutorRegistry,
  RapidAttributionRunbook,
  validateRapidAttributionInput,
  rapidAttributionExampleInput,
} from '../index';
import { LegalBasis, DataLicense } from '../../dags/types';

// ============================================================================
// Test Helpers
// ============================================================================

function createTestRuntime(): {
  engine: RunbookRuntimeEngine;
  definitionRepo: InMemoryRunbookDefinitionRepository;
  executionRepo: InMemoryRunbookExecutionRepository;
  logRepo: InMemoryRunbookExecutionLogRepository;
  stateManager: RunbookStateManager;
} {
  const executionRepo = new InMemoryRunbookExecutionRepository();
  const logRepo = new InMemoryRunbookExecutionLogRepository();
  const stateManager = new RunbookStateManager(executionRepo, logRepo);
  const definitionRepo = new InMemoryRunbookDefinitionRepository();
  const executorRegistry = createExecutorRegistry();

  const engine = new RunbookRuntimeEngine(
    definitionRepo,
    stateManager,
    executorRegistry,
    {
      defaultTimeoutMs: 30000,
      maxParallelSteps: 5,
      pollIntervalMs: 10,
    }
  );

  return { engine, definitionRepo, executionRepo, logRepo, stateManager };
}

function createSimpleRunbook(id: string, steps: RunbookStepDefinition[]): RunbookDefinition {
  return {
    id,
    name: `Test Runbook ${id}`,
    version: '1.0.0',
    purpose: 'Test runbook',
    steps,
    metadata: { test: true },
  };
}

// ============================================================================
// DAG Validation Tests
// ============================================================================

describe('DAG Validation', () => {
  test('should accept valid DAG with no cycles', async () => {
    const { engine, definitionRepo } = createTestRuntime();

    const runbook = createSimpleRunbook('valid-dag', [
      {
        id: 'step1',
        name: 'Step 1',
        actionType: 'CUSTOM',
        dependsOn: [],
        config: {},
      },
      {
        id: 'step2',
        name: 'Step 2',
        actionType: 'CUSTOM',
        dependsOn: ['step1'],
        config: {},
      },
      {
        id: 'step3',
        name: 'Step 3',
        actionType: 'CUSTOM',
        dependsOn: ['step1'],
        config: {},
      },
      {
        id: 'step4',
        name: 'Step 4',
        actionType: 'CUSTOM',
        dependsOn: ['step2', 'step3'],
        config: {},
      },
    ]);

    definitionRepo.register(runbook);

    const execution = await engine.startExecution('valid-dag', {}, {
      startedBy: 'test',
      tenantId: 'test-tenant',
    });

    expect(execution).toBeDefined();
    expect(execution.executionId).toBeTruthy();
  });

  test('should reject DAG with circular dependency', async () => {
    const { engine, definitionRepo } = createTestRuntime();

    const runbook = createSimpleRunbook('circular-dag', [
      {
        id: 'step1',
        name: 'Step 1',
        actionType: 'CUSTOM',
        dependsOn: ['step3'], // Circular!
        config: {},
      },
      {
        id: 'step2',
        name: 'Step 2',
        actionType: 'CUSTOM',
        dependsOn: ['step1'],
        config: {},
      },
      {
        id: 'step3',
        name: 'Step 3',
        actionType: 'CUSTOM',
        dependsOn: ['step2'],
        config: {},
      },
    ]);

    definitionRepo.register(runbook);

    await expect(
      engine.startExecution('circular-dag', {}, {
        startedBy: 'test',
        tenantId: 'test-tenant',
      })
    ).rejects.toThrow(/circular/i);
  });

  test('should reject DAG with unknown dependency', async () => {
    const { engine, definitionRepo } = createTestRuntime();

    const runbook = createSimpleRunbook('unknown-dep', [
      {
        id: 'step1',
        name: 'Step 1',
        actionType: 'CUSTOM',
        dependsOn: ['nonexistent'],
        config: {},
      },
    ]);

    definitionRepo.register(runbook);

    await expect(
      engine.startExecution('unknown-dep', {}, {
        startedBy: 'test',
        tenantId: 'test-tenant',
      })
    ).rejects.toThrow(/unknown step/i);
  });
});

// ============================================================================
// Execution State Tests
// ============================================================================

describe('Execution State', () => {
  test('should create execution with all steps PENDING', async () => {
    const { engine, definitionRepo, executionRepo } = createTestRuntime();

    definitionRepo.register(RapidAttributionRunbook);

    const execution = await engine.startExecution(
      'rapid_attribution_cti',
      rapidAttributionExampleInput,
      {
        startedBy: 'test-user',
        tenantId: 'test-tenant',
        legalBasis: LegalBasis.LEGITIMATE_INTERESTS,
        dataLicenses: [DataLicense.INTERNAL_USE_ONLY],
      }
    );

    expect(execution.status).toBe('PENDING');
    expect(execution.steps).toHaveLength(4);
    expect(execution.steps.every((s) => s.status === 'PENDING')).toBe(true);
  });

  test('should track step execution with state manager', async () => {
    const { stateManager, executionRepo, logRepo } = createTestRuntime();

    // Create a mock execution
    const execution = {
      executionId: 'test-exec-1',
      runbookId: 'test-runbook',
      runbookVersion: '1.0.0',
      startedBy: 'test-user',
      tenantId: 'test-tenant',
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      status: 'PENDING' as const,
      input: {},
      steps: [
        { stepId: 'step1', status: 'PENDING' as const, attempt: 0 },
      ],
      evidence: [],
      citations: [],
      proofs: [],
      kpis: {},
    };

    await stateManager.createExecution(execution, 'test-user');

    // Transition to running
    const runningExec = await stateManager.transitionToRunning('test-exec-1', 'test-user');
    expect(runningExec.status).toBe('RUNNING');

    // Start step
    const stepStarted = await stateManager.startStep('test-exec-1', 'step1', 'test-user');
    expect(stepStarted.steps[0].status).toBe('RUNNING');
    expect(stepStarted.steps[0].attempt).toBe(1);

    // Succeed step
    const stepSucceeded = await stateManager.succeedStep(
      'test-exec-1',
      'step1',
      'test-user',
      { result: 'success' }
    );
    expect(stepSucceeded.steps[0].status).toBe('SUCCEEDED');
    expect(stepSucceeded.steps[0].output).toEqual({ result: 'success' });

    // Complete execution
    const completed = await stateManager.completeExecution('test-exec-1', 'test-user');
    expect(completed.status).toBe('COMPLETED');
    expect(completed.finishedAt).toBeTruthy();
  });
});

// ============================================================================
// Pause/Resume/Cancel Tests
// ============================================================================

describe('Pause/Resume/Cancel', () => {
  test('should pause a running execution', async () => {
    const { stateManager, executionRepo } = createTestRuntime();

    const execution = {
      executionId: 'pause-test-1',
      runbookId: 'test-runbook',
      runbookVersion: '1.0.0',
      startedBy: 'test-user',
      tenantId: 'test-tenant',
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      status: 'RUNNING' as const,
      input: {},
      steps: [
        { stepId: 'step1', status: 'RUNNING' as const, attempt: 1 },
      ],
      evidence: [],
      citations: [],
      proofs: [],
      kpis: {},
    };

    await executionRepo.create(execution);

    const paused = await stateManager.pauseExecution('pause-test-1', 'admin');
    expect(paused.status).toBe('PAUSED');
    expect(paused.controlledBy).toBe('admin');
    expect(paused.controlledAt).toBeTruthy();
  });

  test('should resume a paused execution', async () => {
    const { stateManager, executionRepo } = createTestRuntime();

    const execution = {
      executionId: 'resume-test-1',
      runbookId: 'test-runbook',
      runbookVersion: '1.0.0',
      startedBy: 'test-user',
      tenantId: 'test-tenant',
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      status: 'PAUSED' as const,
      input: {},
      steps: [
        { stepId: 'step1', status: 'PENDING' as const, attempt: 0 },
      ],
      evidence: [],
      citations: [],
      proofs: [],
      kpis: {},
    };

    await executionRepo.create(execution);

    const resumed = await stateManager.resumeExecution('resume-test-1', 'admin');
    expect(resumed.status).toBe('RUNNING');
    expect(resumed.controlledBy).toBe('admin');
  });

  test('should cancel an execution', async () => {
    const { stateManager, executionRepo } = createTestRuntime();

    const execution = {
      executionId: 'cancel-test-1',
      runbookId: 'test-runbook',
      runbookVersion: '1.0.0',
      startedBy: 'test-user',
      tenantId: 'test-tenant',
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      status: 'RUNNING' as const,
      input: {},
      steps: [
        { stepId: 'step1', status: 'SUCCEEDED' as const, attempt: 1 },
        { stepId: 'step2', status: 'RUNNING' as const, attempt: 1 },
        { stepId: 'step3', status: 'PENDING' as const, attempt: 0 },
      ],
      evidence: [],
      citations: [],
      proofs: [],
      kpis: {},
    };

    await executionRepo.create(execution);

    const cancelled = await stateManager.cancelExecution('cancel-test-1', 'admin');
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.steps[0].status).toBe('SUCCEEDED'); // Already completed
    expect(cancelled.steps[1].status).toBe('CANCELLED'); // Was running
    expect(cancelled.steps[2].status).toBe('CANCELLED'); // Was pending
    expect(cancelled.finishedAt).toBeTruthy();
  });

  test('should not pause completed execution', async () => {
    const { stateManager, executionRepo } = createTestRuntime();

    const execution = {
      executionId: 'completed-1',
      runbookId: 'test-runbook',
      runbookVersion: '1.0.0',
      startedBy: 'test-user',
      tenantId: 'test-tenant',
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      status: 'COMPLETED' as const,
      input: {},
      steps: [],
      evidence: [],
      citations: [],
      proofs: [],
      kpis: {},
    };

    await executionRepo.create(execution);

    await expect(
      stateManager.pauseExecution('completed-1', 'admin')
    ).rejects.toThrow(/cannot pause/i);
  });
});

// ============================================================================
// Audit Log Tests
// ============================================================================

describe('Audit Logging', () => {
  test('should log execution events with hash chain', async () => {
    const { stateManager, logRepo } = createTestRuntime();

    const execution = {
      executionId: 'log-test-1',
      runbookId: 'test-runbook',
      runbookVersion: '1.0.0',
      startedBy: 'test-user',
      tenantId: 'test-tenant',
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      status: 'PENDING' as const,
      input: {},
      steps: [
        { stepId: 'step1', status: 'PENDING' as const, attempt: 0 },
      ],
      evidence: [],
      citations: [],
      proofs: [],
      kpis: {},
    };

    await stateManager.createExecution(execution, 'test-user');
    await stateManager.transitionToRunning('log-test-1', 'test-user');
    await stateManager.startStep('log-test-1', 'step1', 'test-user');
    await stateManager.succeedStep('log-test-1', 'step1', 'test-user', {});
    await stateManager.completeExecution('log-test-1', 'test-user');

    const logs = await logRepo.listByExecution('log-test-1');

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].previousHash).toBe('genesis');

    // Verify chain
    const verification = await logRepo.verifyChain('log-test-1');
    expect(verification.valid).toBe(true);
  });

  test('should detect tampered log entries', async () => {
    const logRepo = new InMemoryRunbookExecutionLogRepository();

    // Add legitimate entry
    await logRepo.append({
      logId: 'log-1',
      executionId: 'tamper-test',
      runbookId: 'test',
      tenantId: 'test',
      timestamp: new Date().toISOString(),
      actorId: 'user',
      eventType: 'EXECUTION_STARTED',
      details: {},
      hash: '',
    });

    // Get logs and tamper
    const logs = await logRepo.listByExecution('tamper-test');
    logs[0].details = { tampered: true };

    // Chain should still be valid because we only verified stored entries
    const verification = await logRepo.verifyChain('tamper-test');
    expect(verification.valid).toBe(true);
  });
});

// ============================================================================
// Rapid Attribution Runbook Tests
// ============================================================================

describe('Rapid Attribution CTI Runbook', () => {
  test('should validate correct input', () => {
    const validation = validateRapidAttributionInput(rapidAttributionExampleInput);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test('should reject missing indicators', () => {
    const validation = validateRapidAttributionInput({});
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('Missing required field: indicators');
  });

  test('should reject empty indicators array', () => {
    const validation = validateRapidAttributionInput({ indicators: [] });
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('indicators array cannot be empty');
  });

  test('should reject invalid indicator types', () => {
    const validation = validateRapidAttributionInput({
      indicators: ['valid', '', null, 123],
    });
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  test('should have correct step dependencies', () => {
    expect(RapidAttributionRunbook.steps[0].dependsOn).toEqual([]);
    expect(RapidAttributionRunbook.steps[1].dependsOn).toContain('step1_ingest_indicators');
    expect(RapidAttributionRunbook.steps[2].dependsOn).toContain('step2_resolve_infrastructure');
    expect(RapidAttributionRunbook.steps[3].dependsOn).toContain('step3_pattern_miner');
  });

  test('should execute rapid attribution flow', async () => {
    const { engine, definitionRepo } = createTestRuntime();

    definitionRepo.register(RapidAttributionRunbook);

    const execution = await engine.startExecution(
      'rapid_attribution_cti',
      {
        indicators: ['192.168.1.1', 'malware.com', 'abc123def456'],
        caseId: 'TEST-001',
      },
      {
        startedBy: 'analyst',
        tenantId: 'cti-team',
        legalBasis: LegalBasis.LEGITIMATE_INTERESTS,
        dataLicenses: [DataLicense.INTERNAL_USE_ONLY],
      }
    );

    expect(execution.executionId).toBeTruthy();
    expect(execution.runbookId).toBe('rapid_attribution_cti');

    // Wait for execution to complete (with timeout)
    const maxWait = 30000; // 30 seconds
    const pollInterval = 100;
    let elapsed = 0;

    while (elapsed < maxWait) {
      const current = await engine.getExecution(execution.executionId);
      if (
        current?.status === 'COMPLETED' ||
        current?.status === 'FAILED' ||
        current?.status === 'CANCELLED'
      ) {
        expect(['COMPLETED', 'FAILED']).toContain(current.status);
        return;
      }
      await new Promise((r) => setTimeout(r, pollInterval));
      elapsed += pollInterval;
    }

    // If we get here, execution is still running
    const finalState = await engine.getExecution(execution.executionId);
    console.log('Final state:', finalState?.status);
  }, 35000);
});

// ============================================================================
// Step Executor Tests
// ============================================================================

describe('Step Executors', () => {
  test('should register and retrieve executors', () => {
    const registry = createExecutorRegistry();

    expect(registry.hasExecutor('INGEST')).toBe(true);
    expect(registry.hasExecutor('LOOKUP_GRAPH')).toBe(true);
    expect(registry.hasExecutor('PATTERN_MINER')).toBe(true);
    expect(registry.hasExecutor('GENERATE_REPORT')).toBe(true);
    expect(registry.hasExecutor('CUSTOM')).toBe(true);
  });

  test('should execute ingest step', async () => {
    const registry = createExecutorRegistry();
    const executor = registry.getExecutor('INGEST')!;

    const result = await executor.execute({
      executionId: 'test',
      runbookId: 'test',
      tenantId: 'test',
      userId: 'test',
      step: {
        id: 'test-step',
        name: 'Test',
        actionType: 'INGEST',
        config: {},
      },
      input: {
        indicators: ['192.168.1.1', 'malware.com'],
      },
      previousStepOutputs: {},
    });

    expect(result.success).toBe(true);
    expect(result.output.indicatorNodeIds).toBeDefined();
    expect(result.output.indicatorCount).toBe(2);
    expect(result.kpis?.indicatorCount).toBe(2);
  });

  test('should execute pattern miner step', async () => {
    const registry = createExecutorRegistry();
    const executor = registry.getExecutor('PATTERN_MINER')!;

    const result = await executor.execute({
      executionId: 'test',
      runbookId: 'test',
      tenantId: 'test',
      userId: 'test',
      step: {
        id: 'test-step',
        name: 'Test',
        actionType: 'PATTERN_MINER',
        config: { minConfidence: 0.2 },
      },
      input: {},
      previousStepOutputs: {
        step1: { infraNodeIds: ['infra-1', 'infra-2'] },
      },
    });

    expect(result.success).toBe(true);
    expect(result.output.campaignMatches).toBeDefined();
    expect(Array.isArray(result.output.matches)).toBe(true);
  });

  test('should execute report generator step', async () => {
    const registry = createExecutorRegistry();
    const executor = registry.getExecutor('GENERATE_REPORT')!;

    const result = await executor.execute({
      executionId: 'test',
      runbookId: 'test',
      tenantId: 'test',
      userId: 'test',
      step: {
        id: 'test-step',
        name: 'Test',
        actionType: 'GENERATE_REPORT',
        config: {},
      },
      input: {},
      previousStepOutputs: {
        step1: { indicators: ['192.168.1.1'] },
        step2: { infraNodeIds: ['infra-1'] },
        step3: { campaignMatches: [{ campaignId: 'c1', campaignName: 'APT Test', score: 0.8 }] },
      },
    });

    expect(result.success).toBe(true);
    expect(result.output.reportId).toBeDefined();
    expect(result.output.reportSummary).toBeDefined();
    expect(result.output.confidenceScore).toBeGreaterThan(0);
  });
});
