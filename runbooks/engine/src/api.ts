/**
 * REST API for Runbook Engine
 *
 * Provides endpoints for:
 * - Starting runbook executions
 * - Querying status
 * - Fetching logs
 * - Replaying executions
 * - Listing runbooks
 */

import express, { Request, Response, Router } from 'express';
import { RunbookEngine } from './engine';
import { ExecutionContext, LogQuery } from './types';

/**
 * API version
 */
export const API_VERSION = 'v1';

/**
 * Create API router
 */
export function createRunbookAPI(engine: RunbookEngine): Router {
  const router = express.Router();

  /**
   * GET /runbooks
   * List all registered runbooks
   */
  router.get('/runbooks', (req: Request, res: Response) => {
    try {
      const runbooks = engine.getRunbooks();
      res.json({
        version: API_VERSION,
        count: runbooks.length,
        runbooks: runbooks.map((rb) => ({
          id: rb.id,
          name: rb.name,
          version: rb.version,
          description: rb.description,
          stepCount: rb.steps.length,
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to list runbooks',
        message: (error as Error).message,
      });
    }
  });

  /**
   * GET /runbooks/:id
   * Get runbook definition
   */
  router.get('/runbooks/:id', (req: Request, res: Response) => {
    try {
      const runbook = engine.getRunbook(req.params.id);
      if (!runbook) {
        res.status(404).json({
          error: 'Runbook not found',
          runbookId: req.params.id,
        });
        return;
      }

      res.json({
        version: API_VERSION,
        runbook,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get runbook',
        message: (error as Error).message,
      });
    }
  });

  /**
   * POST /executions
   * Start a new runbook execution
   *
   * Body:
   * {
   *   runbookId: string,
   *   context: ExecutionContext,
   *   input?: Record<string, any>,
   *   options?: { skipIdempotencyCheck?: boolean }
   * }
   */
  router.post('/executions', async (req: Request, res: Response) => {
    try {
      const { runbookId, context, input, options } = req.body;

      if (!runbookId) {
        res.status(400).json({
          error: 'Missing required field: runbookId',
        });
        return;
      }

      if (!context) {
        res.status(400).json({
          error: 'Missing required field: context',
        });
        return;
      }

      // Validate context
      const executionContext: ExecutionContext = {
        legalBasis: context.legalBasis || {
          authority: 'UNKNOWN',
          classification: 'UNCLASSIFIED',
          authorizedUsers: [],
        },
        tenantId: context.tenantId || 'default',
        initiatedBy: context.initiatedBy || 'unknown',
        assumptions: context.assumptions || [],
        timeRange: context.timeRange
          ? {
              startTime: new Date(context.timeRange.startTime),
              endTime: new Date(context.timeRange.endTime),
            }
          : undefined,
        geographicScope: context.geographicScope,
      };

      const executionId = await engine.startRunbook(
        runbookId,
        executionContext,
        input || {},
        options
      );

      res.status(201).json({
        version: API_VERSION,
        executionId,
        status: 'started',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to start runbook execution',
        message: (error as Error).message,
      });
    }
  });

  /**
   * GET /executions/:id
   * Get execution status and results
   */
  router.get('/executions/:id', async (req: Request, res: Response) => {
    try {
      const execution = await engine.getStatus(req.params.id);

      if (!execution) {
        res.status(404).json({
          error: 'Execution not found',
          executionId: req.params.id,
        });
        return;
      }

      // Convert Map to object for JSON serialization
      const stepResults: Record<string, any> = {};
      for (const [stepId, result] of execution.stepResults) {
        stepResults[stepId] = {
          stepId: result.stepId,
          status: result.status,
          startTime: result.startTime,
          endTime: result.endTime,
          durationMs: result.durationMs,
          attemptNumber: result.attemptNumber,
          evidenceCount: result.evidence.length,
          logCount: result.logs.length,
          error: result.error?.message,
        };
      }

      res.json({
        version: API_VERSION,
        execution: {
          id: execution.id,
          runbookId: execution.runbookId,
          runbookVersion: execution.runbookVersion,
          status: execution.status,
          startTime: execution.startTime,
          endTime: execution.endTime,
          durationMs: execution.durationMs,
          isReplay: execution.isReplay,
          originalExecutionId: execution.originalExecutionId,
          stepResults,
          output: execution.output,
          error: execution.error?.message,
          logCount: execution.logs.length,
          evidenceCount: execution.evidence.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get execution status',
        message: (error as Error).message,
      });
    }
  });

  /**
   * GET /executions/:id/logs
   * Get execution logs
   *
   * Query params:
   * - stepId?: string
   * - level?: string
   * - startTime?: ISO date string
   * - endTime?: ISO date string
   * - limit?: number
   * - offset?: number
   */
  router.get('/executions/:id/logs', async (req: Request, res: Response) => {
    try {
      const query: LogQuery = {
        executionId: req.params.id,
        stepId: req.query.stepId as string | undefined,
        level: req.query.level as string | undefined,
        startTime: req.query.startTime
          ? new Date(req.query.startTime as string)
          : undefined,
        endTime: req.query.endTime
          ? new Date(req.query.endTime as string)
          : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset
          ? parseInt(req.query.offset as string)
          : undefined,
      };

      const logs = await engine.getLogs(query);

      res.json({
        version: API_VERSION,
        executionId: req.params.id,
        count: logs.length,
        logs,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get logs',
        message: (error as Error).message,
      });
    }
  });

  /**
   * GET /executions/:id/evidence
   * Get execution evidence
   */
  router.get('/executions/:id/evidence', async (req: Request, res: Response) => {
    try {
      const evidence = await engine.getEvidence(req.params.id);

      res.json({
        version: API_VERSION,
        executionId: req.params.id,
        count: evidence.length,
        evidence,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get evidence',
        message: (error as Error).message,
      });
    }
  });

  /**
   * POST /executions/:id/replay
   * Replay an execution
   *
   * Body (optional):
   * {
   *   context?: ExecutionContext
   * }
   */
  router.post('/executions/:id/replay', async (req: Request, res: Response) => {
    try {
      const { context } = req.body;

      let executionContext: ExecutionContext | undefined;
      if (context) {
        executionContext = {
          legalBasis: context.legalBasis,
          tenantId: context.tenantId,
          initiatedBy: context.initiatedBy,
          assumptions: context.assumptions || [],
          timeRange: context.timeRange
            ? {
                startTime: new Date(context.timeRange.startTime),
                endTime: new Date(context.timeRange.endTime),
              }
            : undefined,
          geographicScope: context.geographicScope,
        };
      }

      const executionId = await engine.replayExecution(
        req.params.id,
        executionContext
      );

      res.status(201).json({
        version: API_VERSION,
        executionId,
        originalExecutionId: req.params.id,
        status: 'replaying',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to replay execution',
        message: (error as Error).message,
      });
    }
  });

  /**
   * GET /executions
   * List executions for a runbook
   *
   * Query params:
   * - runbookId: string (required)
   */
  router.get('/executions', async (req: Request, res: Response) => {
    try {
      const runbookId = req.query.runbookId as string;
      if (!runbookId) {
        res.status(400).json({
          error: 'Missing required query parameter: runbookId',
        });
        return;
      }

      const executions = await engine.getExecutions(runbookId);

      res.json({
        version: API_VERSION,
        runbookId,
        count: executions.length,
        executions: executions.map((exec) => ({
          id: exec.id,
          runbookId: exec.runbookId,
          runbookVersion: exec.runbookVersion,
          status: exec.status,
          startTime: exec.startTime,
          endTime: exec.endTime,
          durationMs: exec.durationMs,
          isReplay: exec.isReplay,
          originalExecutionId: exec.originalExecutionId,
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to list executions',
        message: (error as Error).message,
      });
    }
  });

  /**
   * POST /executions/:id/pause
   * Pause a running execution
   *
   * Body:
   * {
   *   userId: string
   * }
   */
  router.post('/executions/:id/pause', async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        res.status(400).json({
          error: 'Missing required field: userId',
        });
        return;
      }

      await engine.pauseExecution(req.params.id, userId);

      res.json({
        version: API_VERSION,
        executionId: req.params.id,
        status: 'paused',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to pause execution',
        message: (error as Error).message,
      });
    }
  });

  /**
   * POST /executions/:id/resume
   * Resume a paused execution
   *
   * Body:
   * {
   *   userId: string
   * }
   */
  router.post('/executions/:id/resume', async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        res.status(400).json({
          error: 'Missing required field: userId',
        });
        return;
      }

      await engine.resumeExecution(req.params.id, userId);

      res.json({
        version: API_VERSION,
        executionId: req.params.id,
        status: 'resumed',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to resume execution',
        message: (error as Error).message,
      });
    }
  });

  /**
   * POST /executions/:id/cancel
   * Cancel a running or paused execution
   *
   * Body:
   * {
   *   userId: string,
   *   reason?: string
   * }
   */
  router.post('/executions/:id/cancel', async (req: Request, res: Response) => {
    try {
      const { userId, reason } = req.body;
      if (!userId) {
        res.status(400).json({
          error: 'Missing required field: userId',
        });
        return;
      }

      await engine.cancelExecution(req.params.id, userId, reason);

      res.json({
        version: API_VERSION,
        executionId: req.params.id,
        status: 'cancelled',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to cancel execution',
        message: (error as Error).message,
      });
    }
  });

  /**
   * POST /executions/:id/steps/:stepId/retry
   * Retry a failed step
   *
   * Body:
   * {
   *   userId: string
   * }
   */
  router.post(
    '/executions/:id/steps/:stepId/retry',
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.body;
        if (!userId) {
          res.status(400).json({
            error: 'Missing required field: userId',
          });
          return;
        }

        await engine.retryFailedStep(req.params.id, req.params.stepId, userId);

        res.json({
          version: API_VERSION,
          executionId: req.params.id,
          stepId: req.params.stepId,
          status: 'retried',
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to retry step',
          message: (error as Error).message,
        });
      }
    }
  );

  /**
   * GET /health
   * Health check
   */
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      version: API_VERSION,
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
