/**
 * AI Copilot API Routes
 *
 * RESTful API for AI-powered analyst capabilities:
 * - Natural language queries
 * - Graph RAG
 * - Query preview & sandbox
 * - Citation & provenance
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AICopilotOrchestrator, type CopilotQueryRequest } from '../services/AICopilotOrchestrator.js';
import { logger } from '../utils/logger.js';
import { metrics } from '../observability/metrics.js';
import { authMiddleware, requireAuth } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { rateLimitMiddleware } from '../middleware/rateLimit.js';

const router = Router();

// Apply middleware
router.use(authMiddleware);
router.use(tenantMiddleware);

// Request schemas for validation
const CopilotQuerySchema = z.object({
  investigationId: z.string().min(1),
  question: z.string().min(3).max(1000),
  mode: z.enum(['nl2cypher', 'graphrag', 'auto']).optional(),
  focusEntityIds: z.array(z.string()).optional(),
  maxHops: z.number().int().min(1).max(3).optional(),

  redactionPolicy: z.object({
    enabled: z.boolean(),
    rules: z.array(z.enum(['pii', 'financial', 'sensitive', 'k_anon'])),
    allowedFields: z.array(z.string()).optional(),
    classificationLevel: z.enum(['public', 'internal', 'confidential', 'secret']).optional(),
  }).optional(),

  provenanceContext: z.object({
    claimId: z.string().optional(),
    evidenceIds: z.array(z.string()).optional(),
    authorityId: z.string(),
    reasonForAccess: z.string(),
  }).optional(),

  registerClaim: z.boolean().optional(),
  generateQueryPreview: z.boolean().optional(),
  autoExecute: z.boolean().optional(),
  dryRun: z.boolean().optional(),

  maxRows: z.number().int().min(1).max(1000).optional(),
  timeout: z.number().int().min(1000).max(60000).optional(),

  enableGuardrails: z.boolean().optional(),
  riskTolerance: z.enum(['low', 'medium', 'high']).optional(),
});

const ReplayQuerySchema = z.object({
  modifiedQuestion: z.string().min(3).max(1000).optional(),
  modifiedParameters: z.record(z.unknown()).optional(),
  skipCache: z.boolean().optional(),
});

/**
 * POST /api/ai-copilot/query
 *
 * Main AI Copilot query endpoint
 */
router.post('/query',
  rateLimitMiddleware({ maxRequests: 100, windowMs: 60000 }),
  async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    try {
      // Validate request
      const validated = CopilotQuerySchema.parse(req.body);

      const userId = (req as any).user?.id;
      const tenantId = (req as any).tenant?.id;

      if (!userId || !tenantId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User and tenant context required',
        });
      }

      // Get orchestrator instance (would be injected via DI in production)
      const orchestrator = (req as any).orchestrator as AICopilotOrchestrator;
      if (!orchestrator) {
        return res.status(500).json({
          error: 'ServiceUnavailable',
          message: 'AI Copilot service not available',
        });
      }

      const request: CopilotQueryRequest = {
        ...validated,
        userId,
        tenantId,
      };

      logger.info({
        investigationId: request.investigationId,
        userId,
        tenantId,
        mode: request.mode || 'auto',
        questionLength: request.question.length,
      }, 'AI Copilot query request');

      // Execute query
      const response = await orchestrator.query(request);

      const executionTimeMs = Date.now() - startTime;

      metrics.copilotApiRequestTotal.inc({
        endpoint: '/query',
        mode: response.mode,
        status: 'success',
      });
      metrics.copilotApiRequestDurationMs.observe(
        { endpoint: '/query', mode: response.mode },
        executionTimeMs
      );

      return res.status(200).json({
        success: true,
        data: response,
        meta: {
          executionTimeMs,
          mode: response.mode,
          runId: response.runId,
        },
      });

    } catch (error: any) {
      logger.error({
        error: error.message,
        stack: error.stack,
        body: req.body,
      }, 'AI Copilot query failed');

      metrics.copilotApiRequestTotal.inc({
        endpoint: '/query',
        status: 'error',
      });

      // Handle validation errors
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'ValidationError',
          message: 'Invalid request parameters',
          details: error.errors,
        });
      }

      // Handle user-facing errors
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          error: error.name || 'Error',
          message: error.message,
          code: error.code,
        });
      }

      // Generic error
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to process query',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * GET /api/ai-copilot/history/:investigationId
 *
 * Get query history for an investigation
 */
router.get('/history/:investigationId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { investigationId } = req.params;
      const { limit = '20', offset = '0', mode } = req.query;

      const orchestrator = (req as any).orchestrator as AICopilotOrchestrator;
      if (!orchestrator) {
        return res.status(500).json({
          error: 'ServiceUnavailable',
          message: 'AI Copilot service not available',
        });
      }

      const history = await orchestrator.getQueryHistory(investigationId, {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        mode: mode as any,
      });

      return res.status(200).json({
        success: true,
        data: history.queries,
        meta: {
          total: history.total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });

    } catch (error: any) {
      logger.error({
        error: error.message,
        investigationId: req.params.investigationId,
      }, 'Failed to fetch query history');

      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to fetch query history',
      });
    }
  }
);

/**
 * GET /api/ai-copilot/run/:runId
 *
 * Get detailed information about a specific run
 */
router.get('/run/:runId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { runId } = req.params;

      const orchestrator = (req as any).orchestrator as AICopilotOrchestrator;
      if (!orchestrator) {
        return res.status(500).json({
          error: 'ServiceUnavailable',
          message: 'AI Copilot service not available',
        });
      }

      const run = await orchestrator.getRun(runId);

      if (!run) {
        return res.status(404).json({
          error: 'NotFound',
          message: `Run ${runId} not found`,
        });
      }

      return res.status(200).json({
        success: true,
        data: run,
      });

    } catch (error: any) {
      logger.error({
        error: error.message,
        runId: req.params.runId,
      }, 'Failed to fetch run details');

      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to fetch run details',
      });
    }
  }
);

/**
 * POST /api/ai-copilot/replay/:runId
 *
 * Replay a previous query with optional modifications
 */
router.post('/replay/:runId',
  rateLimitMiddleware({ maxRequests: 50, windowMs: 60000 }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { runId } = req.params;
      const validated = ReplayQuerySchema.parse(req.body);

      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User context required',
        });
      }

      const orchestrator = (req as any).orchestrator as AICopilotOrchestrator;
      if (!orchestrator) {
        return res.status(500).json({
          error: 'ServiceUnavailable',
          message: 'AI Copilot service not available',
        });
      }

      const response = await orchestrator.replayQuery(runId, userId, validated);

      return res.status(200).json({
        success: true,
        data: response,
        meta: {
          originalRunId: runId,
          replayRunId: response.runId,
        },
      });

    } catch (error: any) {
      logger.error({
        error: error.message,
        runId: req.params.runId,
      }, 'Failed to replay query');

      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'NotFound',
          message: error.message,
        });
      }

      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to replay query',
      });
    }
  }
);

/**
 * GET /api/ai-copilot/health
 *
 * Health check for AI Copilot services
 */
router.get('/health',
  async (req: Request, res: Response) => {
    try {
      const orchestrator = (req as any).orchestrator as AICopilotOrchestrator;
      if (!orchestrator) {
        return res.status(503).json({
          status: 'unhealthy',
          message: 'AI Copilot service not available',
        });
      }

      const health = await orchestrator.healthCheck();

      const statusCode = health.status === 'healthy' ? 200
        : health.status === 'degraded' ? 200
        : 503;

      return res.status(statusCode).json({
        success: true,
        data: health,
      });

    } catch (error: any) {
      logger.error({
        error: error.message,
      }, 'Health check failed');

      return res.status(503).json({
        status: 'unhealthy',
        error: 'Health check failed',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/ai-copilot/capabilities
 *
 * Get available AI Copilot capabilities
 */
router.get('/capabilities',
  async (req: Request, res: Response) => {
    return res.status(200).json({
      success: true,
      data: {
        modes: [
          {
            mode: 'graphrag',
            name: 'Graph RAG',
            description: 'Retrieval Augmented Generation over knowledge graphs for contextual Q&A',
            capabilities: [
              'Natural language understanding',
              'Contextual answers with citations',
              'Graph traversal and reasoning',
              'Provenance tracking',
              'Redaction awareness',
            ],
          },
          {
            mode: 'nl2cypher',
            name: 'Natural Language to Cypher',
            description: 'Convert natural language questions to Cypher graph queries',
            capabilities: [
              'Structured query generation',
              'Query preview and explanation',
              'Cost estimation',
              'Sandbox execution',
              'Safety validation',
            ],
          },
          {
            mode: 'auto',
            name: 'Auto',
            description: 'Automatically select the best mode based on query characteristics',
            capabilities: [
              'Intelligent mode selection',
              'Seamless UX',
              'All capabilities of both modes',
            ],
          },
        ],
        features: [
          'Guardrails and safety checks',
          'Redaction and policy enforcement',
          'Citation and provenance tracking',
          'Query history and replay',
          'Glass-box run observability',
        ],
      },
    });
  }
);

export default router;
