/**
 * GraphRAG HTTP API Routes
 *
 * POST /graphrag/answer - Get evidence-first answer with citations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import logger from '../utils/logger.js';
import { getGraphRagService, UserContext, GraphRagRequest } from '../services/graphrag/index.js';

const router = Router();

// Request validation schema
const AnswerRequestSchema = z.object({
  caseId: z.string().min(1, 'caseId is required'),
  question: z.string().min(3, 'question must be at least 3 characters').max(2000),
});

// Response limits
const MAX_ANSWER_LENGTH = 10000;
const MAX_CONTEXT_NODES = 100;
const MAX_CONTEXT_EDGES = 200;
const MAX_CONTEXT_EVIDENCE = 50;

/**
 * Extract user context from request (populated by auth middleware)
 */
function extractUserContext(req: Request): UserContext {
  // User context should be populated by auth middleware
  const user = (req as any).user || {};

  return {
    userId: user.userId || user.id || 'anonymous',
    roles: user.roles || [],
    clearances: user.clearances || [],
    needToKnowTags: user.needToKnowTags || [],
    tenantId: user.tenantId,
    classification: user.classification,
    cases: user.cases || [],
  };
}

/**
 * POST /graphrag/answer
 *
 * Request body:
 * {
 *   "caseId": "string",
 *   "question": "string"
 * }
 *
 * Response:
 * {
 *   "answer": {
 *     "answerText": "string",
 *     "citations": [{ "evidenceId": "string", "claimId": "string" }],
 *     "unknowns": ["string"],
 *     "usedContextSummary": { "numNodes": 0, "numEdges": 0, "numEvidenceSnippets": 0 }
 *   },
 *   "rawContext": { ... },
 *   "requestId": "string",
 *   "timestamp": "string"
 * }
 */
router.post(
  '/answer',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      const parseResult = AnswerRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Validation error',
          details: parseResult.error.errors,
        });
        return;
      }

      const { caseId, question } = parseResult.data;

      // Extract user context from authenticated request
      const userContext = extractUserContext(req);

      logger.info({
        message: 'GraphRAG answer request received',
        caseId,
        userId: userContext.userId,
        questionLength: question.length,
      });

      // Build GraphRAG request
      const graphRagRequest: GraphRagRequest = {
        caseId,
        question,
        userId: userContext.userId,
      };

      // Get answer from service
      const service = getGraphRagService();
      const response = await service.answer(graphRagRequest, userContext);

      // Apply response limits
      const limitedResponse = applyResponseLimits(response);

      res.json(limitedResponse);
    } catch (error) {
      logger.error({
        message: 'GraphRAG answer request failed',
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }

      next(error);
    }
  },
);

/**
 * Apply response size limits
 */
function applyResponseLimits(response: any): any {
  // Truncate answer text if too long
  if (response.answer?.answerText?.length > MAX_ANSWER_LENGTH) {
    response.answer.answerText =
      response.answer.answerText.substring(0, MAX_ANSWER_LENGTH) +
      '... [truncated]';
  }

  // Limit raw context sizes
  if (response.rawContext) {
    if (response.rawContext.nodes?.length > MAX_CONTEXT_NODES) {
      response.rawContext.nodes = response.rawContext.nodes.slice(0, MAX_CONTEXT_NODES);
    }
    if (response.rawContext.edges?.length > MAX_CONTEXT_EDGES) {
      response.rawContext.edges = response.rawContext.edges.slice(0, MAX_CONTEXT_EDGES);
    }
    if (response.rawContext.evidenceSnippets?.length > MAX_CONTEXT_EVIDENCE) {
      response.rawContext.evidenceSnippets = response.rawContext.evidenceSnippets.slice(
        0,
        MAX_CONTEXT_EVIDENCE,
      );
    }
  }

  return response;
}

/**
 * GET /graphrag/health
 *
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'graphrag',
    timestamp: new Date().toISOString(),
  });
});

export default router;
