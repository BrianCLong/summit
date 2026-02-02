/**
 * Integration test for R1 Rapid Attribution Runbook
 *
 * Tests:
 * - End-to-end execution with synthetic fixtures
 * - KPI verification (time-to-hypothesis < 30 min)
 * - Evidence-backed claims (all claims have evidence IDs)
 * - Idempotency (re-running with same inputs)
 * - Structured logging
 */

import {
  RunbookEngine,
  EngineConfig,
  ExecutionContext,
  ExecutionStatus,
} from '../../../../engine/src/index';
import { R1_RAPID_ATTRIBUTION } from '../../src/runbook';
import {
  IngestIndicatorsExecutor,
  ResolveInfrastructureExecutor,
  CorrelateAttackExecutor,
  PatternMiningExecutor,
  GenerateHypothesisExecutor,
} from '../../src/executors';

describe('R1 Rapid Attribution - End-to-End Integration', () => {
  let engine: RunbookEngine;
  let testContext: ExecutionContext;

  beforeEach(() => {
    // Configure engine
    const config: EngineConfig = {
      maxConcurrentSteps: 3,
      defaultRetryPolicy: {
        maxAttempts: 3,
        initialDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
        retryableErrors: ['NETWORK_ERROR'],
      },
      storageBackend: 'memory',
      detailedLogging: true,
    };

    engine = new RunbookEngine(config);

    // Register all R1 executors
    engine.registerExecutor(new IngestIndicatorsExecutor());
    engine.registerExecutor(new ResolveInfrastructureExecutor());
    engine.registerExecutor(new CorrelateAttackExecutor());
    engine.registerExecutor(new PatternMiningExecutor());
    engine.registerExecutor(new GenerateHypothesisExecutor());

    // Register R1 runbook
    engine.registerRunbook(R1_RAPID_ATTRIBUTION);

    // Test execution context
    testContext = {
      legalBasis: {
        authority: 'SECURITY_INVESTIGATION',
        caseId: 'CASE-2025-001',
        classification: 'SENSITIVE',
        authorizedUsers: ['analyst-1', 'analyst-2'],
        retentionDays: 90,
      },
      tenantId: 'test-tenant',
      initiatedBy: 'analyst-1',
      assumptions: [
        'Indicators are from trusted threat intel feeds',
        'Attribution based on observable TTPs only',
        'Infrastructure data is current as of analysis date',
      ],
      timeRange: {
        startTime: new Date('2025-01-01'),
        endTime: new Date('2025-01-15'),
      },
    };
  });

  describe('Successful Execution', () => {
    it('should complete R1 runbook successfully with synthetic data', async () => {
      const startTime = Date.now();

      // Start runbook
      const executionId = await engine.startRunbook(
        'r1-rapid-attribution',
        testContext,
        {
          sources: [
            {
              type: 'file',
              location: 's3://threat-intel/indicators-2025-01.json',
            },
          ],
        }
      );

      expect(executionId).toBeDefined();

      // Poll for completion (with timeout)
      let execution = await engine.getStatus(executionId);
      let iterations = 0;
      const maxIterations = 100;

      while (
        execution &&
        execution.status !== ExecutionStatus.COMPLETED &&
        execution.status !== ExecutionStatus.FAILED &&
        iterations < maxIterations
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        execution = await engine.getStatus(executionId);
        iterations++;
      }

      expect(execution).not.toBeNull();
      expect(execution!.status).toBe(ExecutionStatus.COMPLETED);

      const endTime = Date.now();
      const durationMs = endTime - startTime;

      // KPI: Time-to-hypothesis < 30 minutes (simulated)
      expect(execution!.durationMs).toBeDefined();
      expect(execution!.durationMs!).toBeLessThan(30 * 60 * 1000);

      console.log(
        `R1 execution completed in ${execution!.durationMs}ms (simulated: ${durationMs}ms)`
      );
    });

    it('should generate evidence-backed attribution hypothesis', async () => {
      const executionId = await engine.startRunbook(
        'r1-rapid-attribution',
        testContext,
        {}
      );

      // Wait for completion
      let execution = await engine.getStatus(executionId);
      while (
        execution &&
        execution.status !== ExecutionStatus.COMPLETED &&
        execution.status !== ExecutionStatus.FAILED
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        execution = await engine.getStatus(executionId);
      }

      expect(execution).not.toBeNull();
      expect(execution!.output).toBeDefined();

      const output = execution!.output!;
      expect(output.hypotheses).toBeDefined();
      expect(Array.isArray(output.hypotheses)).toBe(true);
      expect(output.hypotheses.length).toBeGreaterThan(0);

      // Verify each hypothesis has evidence
      for (const hypothesis of output.hypotheses) {
        expect(hypothesis.threatActor).toBeDefined();
        expect(hypothesis.confidence).toBeGreaterThan(0);
        expect(hypothesis.evidenceIds).toBeDefined();
        expect(hypothesis.evidenceIds.length).toBeGreaterThanOrEqual(3); // KPI: minimum 3 evidence per claim

        console.log(
          `Hypothesis: ${hypothesis.threatActor} (confidence: ${(hypothesis.confidence * 100).toFixed(1)}%, evidence count: ${hypothesis.evidenceIds.length})`
        );
      }

      // Verify report
      expect(output.report).toBeDefined();
      expect(output.report.title).toBeDefined();
      expect(output.report.summary).toBeDefined();
      expect(output.report.confidence).toBeGreaterThan(0);
      expect(output.report.evidenceCount).toBeGreaterThanOrEqual(3);
    });

    it('should collect evidence from all steps', async () => {
      const executionId = await engine.startRunbook(
        'r1-rapid-attribution',
        testContext,
        {}
      );

      // Wait for completion
      let execution = await engine.getStatus(executionId);
      while (
        execution &&
        execution.status !== ExecutionStatus.COMPLETED &&
        execution.status !== ExecutionStatus.FAILED
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        execution = await engine.getStatus(executionId);
      }

      const evidence = await engine.getEvidence(executionId);

      expect(evidence).toBeDefined();
      expect(evidence.length).toBeGreaterThan(0);

      // Verify evidence types
      const evidenceTypes = new Set(evidence.map((e) => e.type));
      expect(evidenceTypes.has('indicator')).toBe(true);
      expect(evidenceTypes.has('enrichment')).toBe(true);
      expect(evidenceTypes.has('attack-correlation')).toBe(true);

      console.log(
        `Collected ${evidence.length} pieces of evidence across ${evidenceTypes.size} types`
      );
    });

    it('should generate structured logs with assumptions and legal basis', async () => {
      const executionId = await engine.startRunbook(
        'r1-rapid-attribution',
        testContext,
        {}
      );

      // Wait for completion
      let execution = await engine.getStatus(executionId);
      while (
        execution &&
        execution.status !== ExecutionStatus.COMPLETED &&
        execution.status !== ExecutionStatus.FAILED
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        execution = await engine.getStatus(executionId);
      }

      const logs = await engine.getLogs({
        executionId,
      });

      expect(logs).toBeDefined();
      expect(logs.length).toBeGreaterThan(0);

      // Verify structured logging
      const logsWithAssumptions = logs.filter(
        (log) => log.assumptions && log.assumptions.length > 0
      );
      expect(logsWithAssumptions.length).toBeGreaterThan(0);

      const logsWithLegalBasis = logs.filter(
        (log) => log.metadata?.legalBasis
      );
      expect(logsWithLegalBasis.length).toBeGreaterThan(0);

      console.log(
        `Generated ${logs.length} log entries, ${logsWithAssumptions.length} with assumptions`
      );
    });

    it('should track all step executions', async () => {
      const executionId = await engine.startRunbook(
        'r1-rapid-attribution',
        testContext,
        {}
      );

      // Wait for completion
      let execution = await engine.getStatus(executionId);
      while (
        execution &&
        execution.status !== ExecutionStatus.COMPLETED &&
        execution.status !== ExecutionStatus.FAILED
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        execution = await engine.getStatus(executionId);
      }

      expect(execution).not.toBeNull();
      expect(execution!.stepResults.size).toBe(5); // All 5 R1 steps

      // Verify each step completed
      const expectedSteps = [
        'ingest-indicators',
        'resolve-infrastructure',
        'correlate-attack',
        'pattern-mining',
        'generate-hypothesis',
      ];

      for (const stepId of expectedSteps) {
        const result = execution!.stepResults.get(stepId);
        expect(result).toBeDefined();
        expect(result!.status).toBe(ExecutionStatus.COMPLETED);
        expect(result!.durationMs).toBeGreaterThanOrEqual(0); // Can be 0 for very fast steps
        expect(result!.evidence.length).toBeGreaterThan(0);

        console.log(
          `Step ${stepId}: ${result!.durationMs}ms, ${result!.evidence.length} evidence`
        );
      }
    });
  });

  describe('Idempotency', () => {
    it('should return same execution ID for duplicate requests', async () => {
      const input = {
        sources: [{ type: 'file', location: 'test.json' }],
      };

      // First execution
      const executionId1 = await engine.startRunbook(
        'r1-rapid-attribution',
        testContext,
        input
      );

      // Wait for completion
      let execution1 = await engine.getStatus(executionId1);
      let iterations = 0;
      while (
        execution1 &&
        execution1.status !== ExecutionStatus.COMPLETED &&
        execution1.status !== ExecutionStatus.FAILED &&
        iterations < 50
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        execution1 = await engine.getStatus(executionId1);
        iterations++;
      }

      // Ensure it completed
      expect(execution1?.status).toBe(ExecutionStatus.COMPLETED);

      // Small delay to ensure state is fully persisted
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second execution with same input
      const executionId2 = await engine.startRunbook(
        'r1-rapid-attribution',
        testContext,
        input
      );

      // Should return same execution ID (idempotency)
      expect(executionId2).toBe(executionId1);
    });

    it('should create new execution with different inputs', async () => {
      const input1 = {
        sources: [{ type: 'file', location: 'test1.json' }],
      };

      const input2 = {
        sources: [{ type: 'file', location: 'test2.json' }],
      };

      const executionId1 = await engine.startRunbook(
        'r1-rapid-attribution',
        testContext,
        input1
      );

      const executionId2 = await engine.startRunbook(
        'r1-rapid-attribution',
        testContext,
        input2
      );

      // Should be different executions
      expect(executionId2).not.toBe(executionId1);
    });
  });

  describe('Replay Functionality', () => {
    it('should replay completed execution', async () => {
      // Original execution
      const originalExecutionId = await engine.startRunbook(
        'r1-rapid-attribution',
        testContext,
        {}
      );

      // Wait for completion
      let originalExecution = await engine.getStatus(originalExecutionId);
      while (
        originalExecution &&
        originalExecution.status !== ExecutionStatus.COMPLETED &&
        originalExecution.status !== ExecutionStatus.FAILED
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        originalExecution = await engine.getStatus(originalExecutionId);
      }

      // Replay execution
      const replayExecutionId = await engine.replayExecution(
        originalExecutionId
      );

      expect(replayExecutionId).not.toBe(originalExecutionId);

      // Wait for replay completion
      let replayExecution = await engine.getStatus(replayExecutionId);
      while (
        replayExecution &&
        replayExecution.status !== ExecutionStatus.COMPLETED &&
        replayExecution.status !== ExecutionStatus.FAILED
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        replayExecution = await engine.getStatus(replayExecutionId);
      }

      expect(replayExecution).not.toBeNull();
      expect(replayExecution!.isReplay).toBe(true);
      expect(replayExecution!.originalExecutionId).toBe(originalExecutionId);
      expect(replayExecution!.status).toBe(ExecutionStatus.COMPLETED);
    });
  });

  describe('KPI Verification', () => {
    it('should meet all KPIs defined in runbook metadata', async () => {
      const executionId = await engine.startRunbook(
        'r1-rapid-attribution',
        testContext,
        {}
      );

      // Wait for completion
      let execution = await engine.getStatus(executionId);
      while (
        execution &&
        execution.status !== ExecutionStatus.COMPLETED &&
        execution.status !== ExecutionStatus.FAILED
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        execution = await engine.getStatus(executionId);
      }

      expect(execution).not.toBeNull();

      // KPI 1: Time-to-hypothesis < 30 minutes
      expect(execution!.durationMs!).toBeLessThan(30 * 60 * 1000);

      // KPI 2: Minimum evidence per claim
      const hypotheses = execution!.output?.hypotheses || [];
      for (const hypothesis of hypotheses) {
        expect(hypothesis.evidenceIds.length).toBeGreaterThanOrEqual(3);
      }

      // KPI 3: Minimum confidence
      expect(execution!.output?.report?.confidence).toBeGreaterThanOrEqual(
        0.6
      );

      console.log('All KPIs met:');
      console.log(`  - Time-to-hypothesis: ${execution!.durationMs}ms`);
      console.log(
        `  - Evidence per claim: ${hypotheses[0]?.evidenceIds.length}`
      );
      console.log(
        `  - Confidence: ${(execution!.output?.report?.confidence * 100).toFixed(1)}%`
      );
    });
  });
});
