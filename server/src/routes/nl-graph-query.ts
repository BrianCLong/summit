// @ts-nocheck
/**
 * NL Graph Query Copilot API Endpoints
 * Provides a natural language to Cypher compilation service
 */

import express, { Request, Response } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import { getNlGraphQueryService } from '../ai/nl-graph-query/index.js';
import type { CompileRequest, SchemaContext } from '../ai/nl-graph-query/index.js';
import {
  incrementTenantBudgetHit,
  recordEndpointResult,
} from '../observability/reliability-metrics';

const logger = pino({ name: 'nl-graph-query-routes' });
const router = express.Router();
const tracer = trace.getTracer('intelgraph-server.reliability');
let graphQueryInFlight = 0;

// Rate limiting for NL query compilation (moderate limits)
const nlQueryRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many query compilation requests, please try again later',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
router.use(nlQueryRateLimit);

// Validation middleware for compile endpoint
const validateCompileRequest = [
  body('prompt')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('prompt is required')
    .isLength({ max: 1000 })
    .withMessage('prompt must be at most 1000 characters'),

  body('schemaContext')
    .isObject()
    .withMessage('schemaContext is required and must be an object'),

  body('schemaContext.nodeLabels')
    .optional()
    .isArray()
    .withMessage('nodeLabels must be an array'),

  body('schemaContext.relationshipTypes')
    .optional()
    .isArray()
    .withMessage('relationshipTypes must be an array'),

  body('schemaContext.policyTags')
    .optional()
    .isArray()
    .withMessage('policyTags must be an array'),

  body('schemaContext.tenantId')
    .optional()
    .isString()
    .withMessage('tenantId must be a string'),

  body('schemaContext.userId')
    .optional()
    .isString()
    .withMessage('userId must be a string'),

  body('schemaContext.investigationId')
    .optional()
    .isString()
    .withMessage('investigationId must be a string'),

  body('parameters')
    .optional()
    .isObject()
    .withMessage('parameters must be an object'),

  body('verbose')
    .optional()
    .isBoolean()
    .withMessage('verbose must be a boolean'),
];

/**
 * POST /ai/nl-graph-query/compile
 * Compile a natural language prompt into a Cypher query
 *
 * Request body:
 * {
 *   prompt: string,
 *   schemaContext: SchemaContext,
 *   parameters?: Record<string, any>,
 *   verbose?: boolean
 * }
 *
 * Response:
 * Success (200):
 * {
 *   queryId: string,
 *   cypher: string,
 *   explanationDetails: {
 *     summary: string,
 *     rationale: string[],
 *     evidence: { source: string, snippet: string, reason: string }[],
 *     confidence: number
 *   },
 *   estimatedCost: CostEstimate,
 *   explanation: string,
 *   requiredParameters: string[],
 *   isSafe: boolean,
 *   warnings: string[],
 *   timestamp: Date
 * }
 *
 * Error (400, 500):
 * {
 *   code: string,
 *   message: string,
 *   suggestions: string[],
 *   originalPrompt: string
 * }
 */
router.post(
  '/compile',
  validateCompileRequest,
  async (req: Request, res: Response) => {
    const startTime = process.hrtime.bigint();
    const span = tracer.startSpan('graph.query.compile', {
      attributes: {
        'http.method': 'POST',
        'http.route': '/ai/nl-graph-query/compile',
      },
    });
    graphQueryInFlight += 1;
    let statusCode = 500;
    let tenantId: string | undefined = req.body?.schemaContext?.tenantId;

    try {
      const { prompt, schemaContext, parameters, verbose } = req.body;

      const validation = validationResult(req);
      if (!validation.isEmpty()) {
        statusCode = 400;
        const details = validation.array();
        span.setAttribute('validation_error.count', details.length);
        return res.status(statusCode).json({
          error: 'Validation failed',
          details,
        });
      }

      logger.info(
        {
          prompt: prompt.substring(0, 100), // Log first 100 chars
          tenantId: schemaContext.tenantId,
          userId: schemaContext.userId,
          hasParameters: !!parameters,
          verbose,
        },
        'NL query compilation request received',
      );

      tenantId = schemaContext?.tenantId;
      incrementTenantBudgetHit('graph_query', tenantId);

      const compileRequest: CompileRequest = {
        prompt,
        schemaContext: schemaContext as SchemaContext,
        parameters,
        verbose: verbose || false,
      };

      const service = getNlGraphQueryService();
      const result = await service.compile(compileRequest);

      const responseTime = Number(process.hrtime.bigint() - startTime) / 1e6;

      // Check if result is an error
      if ('code' in result) {
        // CompileError
        statusCode = 400;
        logger.warn(
          {
            errorCode: result.code,
            message: result.message,
            responseTimeMs: responseTime,
          },
          'Query compilation failed with error',
        );

        return res.status(400).json(result);
      }

      // Success - CompileResponse
      logger.info(
        {
          queryId: result.queryId,
          costClass: result.estimatedCost.costClass,
          isSafe: result.isSafe,
          warningCount: result.warnings.length,
          requiredParamsCount: result.requiredParameters.length,
          explanationConfidence: result.explanationDetails.confidence,
          evidenceCount: result.explanationDetails.evidence.length,
          responseTimeMs: responseTime,
        },
        'Query compilation successful with explanation payload',
      );

      statusCode = 200;
      return res.status(200).json({
        ...result,
        metadata: {
          compilationTimeMs: responseTime,
          service: 'nl-graph-query-copilot',
          version: '1.0.0',
          explanation: {
            confidence: result.explanationDetails.confidence,
            evidenceCount: result.explanationDetails.evidence.length,
          },
        },
      });
    } catch (error) {
      const responseTime = Number(process.hrtime.bigint() - startTime) / 1e6;

      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          responseTimeMs: responseTime,
        },
        'Unexpected error in compile endpoint',
      );

      statusCode = 500;
      return res.status(500).json({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred during query compilation',
        suggestions: [
          'Please try again',
          'If the problem persists, contact support',
        ],
        originalPrompt: req.body.prompt || '',
      });
    }
    finally {
      graphQueryInFlight = Math.max(graphQueryInFlight - 1, 0);
      const durationSeconds = Number(process.hrtime.bigint() - startTime) / 1e9;
      recordEndpointResult({
        endpoint: 'graph_query',
        statusCode,
        durationSeconds,
        tenantId,
        queueDepth: graphQueryInFlight,
      });

      span.setAttributes({
        'http.status_code': statusCode,
        'tenant.id': tenantId ?? 'unknown',
        'nl_graph_query.in_flight': graphQueryInFlight,
        'nl_graph_query.prompt_length': req.body?.prompt?.length || 0,
      });

      if (statusCode >= 400) {
        span.setStatus({ code: SpanStatusCode.ERROR });
      }

      span.end();
    }
  },
);

/**
 * GET /ai/nl-graph-query/patterns
 * Get information about available query patterns
 *
 * Response:
 * {
 *   patterns: Array<{
 *     name: string,
 *     description: string,
 *     expectedCost: string
 *   }>,
 *   count: number
 * }
 */
router.get('/patterns', async (req: Request, res: Response) => {
  try {
    const service = getNlGraphQueryService();
    const patterns = service.getAvailablePatterns();

    logger.info(
      { patternCount: patterns.length },
      'Returning available query patterns',
    );

    return res.status(200).json({
      patterns,
      count: patterns.length,
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Error retrieving patterns',
    );

    return res.status(500).json({
      error: 'Failed to retrieve patterns',
      message: 'An unexpected error occurred',
    });
  }
});

/**
 * GET /ai/nl-graph-query/health
 * Health check for the NL query service
 *
 * Response:
 * {
 *   status: 'healthy' | 'degraded',
 *   cache: { size: number, maxSize: number },
 *   uptime: number
 * }
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const service = getNlGraphQueryService();
    const cacheStats = service.getCacheStats();

    return res.status(200).json({
      status: 'healthy',
      cache: cacheStats,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Health check failed',
    );

    return res.status(503).json({
      status: 'degraded',
      error: 'Service health check failed',
    });
  }
});

/**
 * POST /ai/nl-graph-query/cache/clear
 * Clear the query compilation cache
 *
 * Response:
 * {
 *   success: boolean,
 *   message: string
 * }
 */
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    const service = getNlGraphQueryService();
    service.clearCache();

    logger.info('Query cache cleared via API request');

    return res.status(200).json({
      success: true,
      message: 'Query cache cleared successfully',
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Failed to clear cache',
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
    });
  }
});

export default router;
