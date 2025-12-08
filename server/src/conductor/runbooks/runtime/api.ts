/**
 * Runbook Runtime API
 *
 * REST API endpoints for runbook execution with:
 * - Start execution
 * - Get execution status
 * - Control execution (pause/resume/cancel)
 * - Get execution logs
 *
 * @module runbooks/runtime/api
 */

import express, { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import {
  RunbookControlAction,
  RunbookExecution,
  RunbookExecutionLogEntry,
} from './types';
import { LegalBasis, DataLicense } from '../dags/types';
import {
  RunbookStateManager,
  RedisRunbookExecutionRepository,
  RedisRunbookExecutionLogRepository,
  InMemoryRunbookExecutionRepository,
  InMemoryRunbookExecutionLogRepository,
} from './state-manager';
import {
  RunbookRuntimeEngine,
  InMemoryRunbookDefinitionRepository,
} from './engine';
import { createExecutorRegistry } from './executors/registry';
import {
  RapidAttributionRunbook,
  validateRapidAttributionInput,
} from './rapid-attribution-runbook';

// ============================================================================
// Router Setup
// ============================================================================

export const runtimeApiRouter = express.Router();

// ============================================================================
// Runtime Initialization
// ============================================================================

let runtimeEngine: RunbookRuntimeEngine | null = null;
let stateManager: RunbookStateManager | null = null;
let logRepository: RedisRunbookExecutionLogRepository | InMemoryRunbookExecutionLogRepository | null = null;

/**
 * Initialize the runtime with Redis or in-memory storage
 */
function initializeRuntime(): void {
  if (runtimeEngine) return;

  const useRedis = process.env.REDIS_URL && process.env.NODE_ENV !== 'test';

  let executionRepo;
  let logRepo;

  if (useRedis) {
    const redis = new Redis(process.env.REDIS_URL!);
    executionRepo = new RedisRunbookExecutionRepository(redis);
    logRepo = new RedisRunbookExecutionLogRepository(redis);
  } else {
    executionRepo = new InMemoryRunbookExecutionRepository();
    logRepo = new InMemoryRunbookExecutionLogRepository();
  }

  logRepository = logRepo;
  stateManager = new RunbookStateManager(executionRepo, logRepo);

  // Create definition repository and register default runbooks
  const definitionRepo = new InMemoryRunbookDefinitionRepository();
  definitionRepo.register(RapidAttributionRunbook);

  // Create executor registry with all default executors
  const executorRegistry = createExecutorRegistry();

  // Create runtime engine
  runtimeEngine = new RunbookRuntimeEngine(
    definitionRepo,
    stateManager,
    executorRegistry,
    {
      defaultTimeoutMs: 300000, // 5 minutes
      maxParallelSteps: 5,
      pollIntervalMs: 100,
    }
  );
}

// Middleware to ensure runtime is initialized
function ensureRuntime(req: Request, res: Response, next: NextFunction): void {
  initializeRuntime();
  next();
}

runtimeApiRouter.use(ensureRuntime);

// ============================================================================
// Request Types
// ============================================================================

interface StartExecutionRequest {
  input: Record<string, unknown>;
  authorityIds?: string[];
  legalBasis?: string;
  dataLicenses?: string[];
}

interface ControlExecutionRequest {
  action: RunbookControlAction;
}

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * Start a new runbook execution
 * POST /runtime/runbooks/:runbookId/execute
 */
runtimeApiRouter.post('/runbooks/:runbookId/execute', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { runbookId } = req.params;
    const body = req.body as StartExecutionRequest;
    const userId = (req as any).user?.sub || 'anonymous';
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Validate input for known runbooks
    if (runbookId === 'rapid_attribution_cti') {
      const validation = validateRapidAttributionInput(body.input);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input',
          errors: validation.errors,
          processingTime: Date.now() - startTime,
        });
      }
    }

    // Parse legal basis and data licenses
    const legalBasis = body.legalBasis
      ? (body.legalBasis as LegalBasis)
      : LegalBasis.LEGITIMATE_INTERESTS;

    const dataLicenses = body.dataLicenses
      ? (body.dataLicenses as DataLicense[])
      : [DataLicense.INTERNAL_USE_ONLY];

    // Start execution
    const execution = await runtimeEngine!.startExecution(runbookId, body.input, {
      startedBy: userId,
      tenantId,
      authorityIds: body.authorityIds,
      legalBasis,
      dataLicenses,
    });

    res.status(202).json({
      success: true,
      executionId: execution.executionId,
      status: execution.status,
      message: 'Execution started',
      processingTime: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Execution start error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to start execution',
      processingTime: Date.now() - startTime,
    });
  }
});

/**
 * Get execution status
 * GET /runtime/executions/:executionId
 */
runtimeApiRouter.get('/executions/:executionId', async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const execution = await runtimeEngine!.getExecution(executionId);

    if (!execution) {
      return res.status(404).json({
        success: false,
        message: 'Execution not found',
      });
    }

    // Check tenant access
    if (execution.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: tenant boundary violation',
      });
    }

    res.json({
      success: true,
      execution: formatExecutionResponse(execution),
    });
  } catch (error) {
    console.error('Execution retrieval error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve execution',
    });
  }
});

/**
 * Control execution (pause/resume/cancel)
 * POST /runtime/executions/:executionId/control
 */
runtimeApiRouter.post('/executions/:executionId/control', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { executionId } = req.params;
    const { action } = req.body as ControlExecutionRequest;
    const userId = (req as any).user?.sub || 'anonymous';
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Validate action
    if (!['PAUSE', 'RESUME', 'CANCEL'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be PAUSE, RESUME, or CANCEL',
        processingTime: Date.now() - startTime,
      });
    }

    // Get execution to verify tenant access
    const currentExecution = await runtimeEngine!.getExecution(executionId);

    if (!currentExecution) {
      return res.status(404).json({
        success: false,
        message: 'Execution not found',
        processingTime: Date.now() - startTime,
      });
    }

    if (currentExecution.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: tenant boundary violation',
        processingTime: Date.now() - startTime,
      });
    }

    // Execute control action
    const execution = await runtimeEngine!.controlExecution(executionId, action, userId);

    res.json({
      success: true,
      executionId: execution.executionId,
      status: execution.status,
      message: `Execution ${action.toLowerCase()}${action === 'PAUSE' ? 'd' : action === 'RESUME' ? 'd' : 'led'}`,
      processingTime: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Execution control error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to control execution',
      processingTime: Date.now() - startTime,
    });
  }
});

/**
 * Get execution logs
 * GET /runtime/executions/:executionId/logs
 */
runtimeApiRouter.get('/executions/:executionId/logs', async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Get execution to verify tenant access
    const execution = await runtimeEngine!.getExecution(executionId);

    if (!execution) {
      return res.status(404).json({
        success: false,
        message: 'Execution not found',
      });
    }

    if (execution.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: tenant boundary violation',
      });
    }

    // Get logs
    const logs = await logRepository!.listByExecution(executionId);

    res.json({
      success: true,
      executionId,
      logs: logs.map(formatLogEntry),
      total: logs.length,
    });
  } catch (error) {
    console.error('Logs retrieval error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve logs',
    });
  }
});

/**
 * Verify log chain integrity
 * GET /runtime/executions/:executionId/logs/verify
 */
runtimeApiRouter.get('/executions/:executionId/logs/verify', async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Get execution to verify tenant access
    const execution = await runtimeEngine!.getExecution(executionId);

    if (!execution) {
      return res.status(404).json({
        success: false,
        message: 'Execution not found',
      });
    }

    if (execution.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: tenant boundary violation',
      });
    }

    // Verify chain
    const verification = await logRepository!.verifyChain(executionId);

    res.json({
      success: true,
      executionId,
      chainIntegrity: verification,
    });
  } catch (error) {
    console.error('Chain verification error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify chain',
    });
  }
});

/**
 * List available runbooks
 * GET /runtime/runbooks
 */
runtimeApiRouter.get('/runbooks', async (req: Request, res: Response) => {
  try {
    // For now, return the registered runbooks
    res.json({
      success: true,
      runbooks: [
        {
          id: RapidAttributionRunbook.id,
          name: RapidAttributionRunbook.name,
          version: RapidAttributionRunbook.version,
          purpose: RapidAttributionRunbook.purpose,
          stepCount: RapidAttributionRunbook.steps.length,
          estimatedDurationMs: RapidAttributionRunbook.benchmarks?.totalMs,
        },
      ],
    });
  } catch (error) {
    console.error('Runbook listing error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to list runbooks',
    });
  }
});

/**
 * Get runbook details
 * GET /runtime/runbooks/:runbookId
 */
runtimeApiRouter.get('/runbooks/:runbookId', async (req: Request, res: Response) => {
  try {
    const { runbookId } = req.params;

    if (runbookId === 'rapid_attribution_cti') {
      res.json({
        success: true,
        runbook: {
          ...RapidAttributionRunbook,
          steps: RapidAttributionRunbook.steps.map((step) => ({
            id: step.id,
            name: step.name,
            description: step.description,
            actionType: step.actionType,
            dependsOn: step.dependsOn,
            timeoutMs: step.timeoutMs,
            retryPolicy: step.retryPolicy,
          })),
        },
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Runbook not found',
      });
    }
  } catch (error) {
    console.error('Runbook retrieval error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve runbook',
    });
  }
});

/**
 * Health check
 * GET /runtime/health
 */
runtimeApiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'runbook-runtime-api',
  });
});

// ============================================================================
// Response Formatters
// ============================================================================

function formatExecutionResponse(execution: RunbookExecution): object {
  return {
    executionId: execution.executionId,
    runbookId: execution.runbookId,
    runbookVersion: execution.runbookVersion,
    status: execution.status,
    startedBy: execution.startedBy,
    tenantId: execution.tenantId,
    startedAt: execution.startedAt,
    lastUpdatedAt: execution.lastUpdatedAt,
    finishedAt: execution.finishedAt,
    steps: execution.steps.map((step) => ({
      stepId: step.stepId,
      status: step.status,
      attempt: step.attempt,
      startedAt: step.startedAt,
      finishedAt: step.finishedAt,
      durationMs: step.durationMs,
      errorMessage: step.errorMessage,
      hasOutput: !!step.output,
    })),
    kpis: execution.kpis,
    evidenceCount: execution.evidence.length,
    citationCount: execution.citations.length,
    proofCount: execution.proofs.length,
    error: execution.error,
    controlledBy: execution.controlledBy,
    controlledAt: execution.controlledAt,
  };
}

function formatLogEntry(entry: RunbookExecutionLogEntry): object {
  return {
    logId: entry.logId,
    timestamp: entry.timestamp,
    eventType: entry.eventType,
    stepId: entry.stepId,
    actorId: entry.actorId,
    details: entry.details,
    hash: entry.hash,
  };
}

export default runtimeApiRouter;
