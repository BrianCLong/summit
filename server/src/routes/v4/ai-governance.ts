/**
 * AI Governance API Routes (v4)
 *
 * Production-ready API endpoints for AI-assisted governance features:
 * - Policy suggestions
 * - Verdict explanations
 * - Behavioral anomaly detection
 *
 * @module routes/v4/ai-governance
 * @version 4.0.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { requirePermission, requireRole } from '../../middleware/rbac.js';
import logger from '../../utils/logger.js';
import {
  PolicySuggestionService,
  createPolicySuggestionService,
  PolicySuggestionError,
  SuggestionStatistics,
} from '../../ai/governance/PolicySuggestionService.js';
import {
  VerdictExplainerService,
  createVerdictExplainerService,
} from '../../ai/governance/VerdictExplainerService.js';
import {
  BehavioralAnomalyService,
  createBehavioralAnomalyService,
} from '../../ai/governance/BehavioralAnomalyService.js';
import {
  PolicySuggestion,
  SuggestionContext,
  SuggestionFeedback,
  ExplainedVerdict,
  ExplanationContext,
  BehavioralAnomaly,
  AnomalyDetectionScope,
  AnomalyStatus,
  AnomalyResolution,
  AIGovernanceConfig,
} from '../../ai/governance/types.js';
import { GovernanceVerdict } from '../../governance/types.js';

// =============================================================================
// Types
// =============================================================================

// Use the Request type directly - user is defined in global Express declarations

interface DataEnvelope<T> {
  data: T;
  metadata: {
    requestId: string;
    timestamp: string;
    version: string;
  };
  governance: GovernanceVerdict;
}

// =============================================================================
// Service Initialization
// =============================================================================

let policySuggestionService: PolicySuggestionService | null = null;
let verdictExplainerService: VerdictExplainerService | null = null;
let anomalyService: BehavioralAnomalyService | null = null;

const getConfig = (): Partial<AIGovernanceConfig> => ({
  enabled: process.env.AI_GOVERNANCE_ENABLED !== 'false',
  policySuggestions: {
    enabled: process.env.AI_POLICY_SUGGESTIONS_ENABLED !== 'false',
    maxSuggestionsPerDay: parseInt(process.env.AI_MAX_SUGGESTIONS_PER_DAY || '10'),
    minConfidenceThreshold: parseFloat(process.env.AI_MIN_CONFIDENCE || '0.6'),
    requireHumanApproval: process.env.AI_REQUIRE_HUMAN_APPROVAL !== 'false',
  },
  llmSettings: {
    provider: (process.env.LLM_PROVIDER as 'openai' | 'anthropic' | 'mock') || 'mock',
    model: process.env.LLM_MODEL || 'gpt-4-turbo',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4096'),
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.3'),
    timeout: parseInt(process.env.LLM_TIMEOUT || '30000'),
  },
  privacySettings: {
    piiRedaction: process.env.AI_PII_REDACTION !== 'false',
    federatedLearning: process.env.AI_FEDERATED_LEARNING === 'true',
    differentialPrivacy: process.env.AI_DIFFERENTIAL_PRIVACY !== 'false',
    epsilonBudget: parseFloat(process.env.AI_EPSILON_BUDGET || '1.0'),
    dataRetentionDays: parseInt(process.env.AI_DATA_RETENTION_DAYS || '90'),
  },
});

const initializeServices = async () => {
  if (!policySuggestionService) {
    const config = getConfig();
    policySuggestionService = createPolicySuggestionService(config);
    verdictExplainerService = createVerdictExplainerService(config);
    anomalyService = createBehavioralAnomalyService(config);

    await policySuggestionService.initialize();
    logger.info('AI Governance services initialized');
  }
};

// =============================================================================
// Helper Functions
// =============================================================================

const getTenantId = (req: Request): string => {
  return req.tenantId || req.user?.tenantId || 'default';
};

const getUserId = (req: Request): string => {
  return req.user?.id || req.user?.id || 'anonymous';
};

const wrapResponse = <T>(data: T, req: Request): DataEnvelope<T> => {
  return {
    data,
    metadata: {
      requestId: req.correlationId || randomUUID(),
      timestamp: new Date().toISOString(),
      version: '4.0.0',
    },
    governance: {
      action: 'ALLOW',
      reasons: ['AI governance response'],
      policyIds: ['ai-governance-v4'],
      metadata: {
        timestamp: new Date().toISOString(),
        evaluator: 'ai-governance-router',
        latencyMs: 0,
        simulation: false,
      },
      provenance: {
        origin: 'ai-governance-api-v4',
        confidence: 0.95,
      },
    },
  };
};

const handleError = (error: unknown, res: Response, operation: string) => {
  if (error instanceof PolicySuggestionError) {
    const statusMap: Record<string, number> = {
      NOT_FOUND: 404,
      INVALID_STATE: 400,
      GENERATION_FAILED: 500,
      RATE_LIMITED: 429,
    };
    const status = statusMap[error.code] || 500;
    return res.status(status).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  logger.error({ error, operation }, 'AI Governance API error');
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    },
  });
};

// =============================================================================
// Router
// =============================================================================

const router = Router();

// Initialize services middleware
router.use(async (_req, _res, next) => {
  try {
    await initializeServices();
    next();
  } catch (error: any) {
    logger.error({ error }, 'Failed to initialize AI governance services');
    next(error);
  }
});

// =============================================================================
// Policy Suggestions Endpoints
// =============================================================================

/**
 * @swagger
 * /api/v4/ai/policy-suggestions:
 *   post:
 *     summary: Generate AI-powered policy suggestions
 *     tags: [AI Governance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               focusAreas:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [gap_detection, conflict_resolution, usage_based, optimization, risk_mitigation]
 *               complianceFrameworks:
 *                 type: array
 *                 items:
 *                   type: string
 *               timeRange:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date-time
 *                   end:
 *                     type: string
 *                     format: date-time
 *     responses:
 *       200:
 *         description: Policy suggestions generated
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/policy-suggestions',
  requirePermission('ai:suggestions:generate'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const context: SuggestionContext = {
        tenantId,
        triggeredBy: 'manual',
        focusAreas: req.body.focusAreas,
        complianceFrameworks: req.body.complianceFrameworks,
        timeRange: req.body.timeRange,
      };

      const suggestions = await policySuggestionService!.generateSuggestions(context);

      logger.info({
        tenantId,
        userId: getUserId(req),
        suggestionCount: suggestions.length,
      }, 'Policy suggestions generated');

      res.json(wrapResponse(suggestions, req));
    } catch (error: any) {
      handleError(error, res, 'generateSuggestions');
    }
  }
);

/**
 * @swagger
 * /api/v4/ai/policy-suggestions:
 *   get:
 *     summary: List policy suggestions
 *     tags: [AI Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, implemented, expired]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of suggestions
 */
router.get(
  '/policy-suggestions',
  requirePermission('ai:suggestions:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const status = req.query.status as PolicySuggestion['status'] | undefined;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await policySuggestionService!.listSuggestions(tenantId, {
        status,
        limit,
        offset,
      });

      res.json(wrapResponse(result, req));
    } catch (error: any) {
      handleError(error, res, 'listSuggestions');
    }
  }
);

/**
 * @swagger
 * /api/v4/ai/policy-suggestions/{id}:
 *   get:
 *     summary: Get a specific suggestion
 *     tags: [AI Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Suggestion details
 *       404:
 *         description: Suggestion not found
 */
router.get(
  '/policy-suggestions/:id',
  requirePermission('ai:suggestions:read'),
  async (req: Request, res: Response) => {
    try {
      const suggestion = await policySuggestionService!.getSuggestion(req.params.id);

      if (!suggestion) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Suggestion not found: ${req.params.id}`,
          },
        });
      }

      res.json(wrapResponse(suggestion, req));
    } catch (error: any) {
      handleError(error, res, 'getSuggestion');
    }
  }
);

/**
 * @swagger
 * /api/v4/ai/policy-suggestions/{id}/review:
 *   post:
 *     summary: Review a policy suggestion
 *     tags: [AI Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - decision
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [approve, reject, defer]
 *               reason:
 *                 type: string
 *               modifications:
 *                 type: object
 *     responses:
 *       200:
 *         description: Suggestion reviewed
 */
router.post(
  '/policy-suggestions/:id/review',
  requirePermission('ai:suggestions:review'),
  async (req: Request, res: Response) => {
    try {
      const feedback: SuggestionFeedback = {
        reviewedBy: getUserId(req),
        reviewedAt: new Date().toISOString(),
        decision: req.body.decision,
        reason: req.body.reason,
        modifications: req.body.modifications,
      };

      const suggestion = await policySuggestionService!.reviewSuggestion(
        req.params.id,
        feedback
      );

      logger.info({
        suggestionId: req.params.id,
        decision: feedback.decision,
        reviewedBy: feedback.reviewedBy,
      }, 'Suggestion reviewed');

      res.json(wrapResponse(suggestion, req));
    } catch (error: any) {
      handleError(error, res, 'reviewSuggestion');
    }
  }
);

/**
 * @swagger
 * /api/v4/ai/policy-suggestions/{id}/implement:
 *   post:
 *     summary: Implement an approved suggestion
 *     tags: [AI Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Suggestion implemented
 */
router.post(
  '/policy-suggestions/:id/implement',
  requirePermission('ai:suggestions:implement'),
  async (req: Request, res: Response) => {
    try {
      const result = await policySuggestionService!.implementSuggestion(req.params.id);

      logger.info({
        suggestionId: req.params.id,
        policyId: result.policyId,
        implementedBy: getUserId(req),
      }, 'Suggestion implemented');

      res.json(wrapResponse(result, req));
    } catch (error: any) {
      handleError(error, res, 'implementSuggestion');
    }
  }
);

/**
 * @swagger
 * /api/v4/ai/policy-suggestions/statistics:
 *   get:
 *     summary: Get suggestion statistics
 *     tags: [AI Governance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Suggestion statistics
 */
router.get(
  '/policy-suggestions/statistics',
  requirePermission('ai:suggestions:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const statistics = await policySuggestionService!.getStatistics(tenantId);

      res.json(wrapResponse(statistics, req));
    } catch (error: any) {
      handleError(error, res, 'getStatistics');
    }
  }
);

// =============================================================================
// Verdict Explanation Endpoints
// =============================================================================

/**
 * @swagger
 * /api/v4/ai/verdict-explanations:
 *   post:
 *     summary: Generate explanation for a governance verdict
 *     tags: [AI Governance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - verdict
 *             properties:
 *               verdict:
 *                 type: object
 *                 description: The GovernanceVerdict to explain
 *               audience:
 *                 type: string
 *                 enum: [end_user, developer, compliance_officer, executive]
 *               tone:
 *                 type: string
 *                 enum: [formal, friendly, technical]
 *               includeExamples:
 *                 type: boolean
 *               maxLength:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Explained verdict
 */
router.post(
  '/verdict-explanations',
  requirePermission('ai:explanations:generate'),
  async (req: Request, res: Response) => {
    try {
      const verdict: GovernanceVerdict = req.body.verdict;
      const context: ExplanationContext = {
        audience: req.body.audience || 'end_user',
        tone: req.body.tone || 'friendly',
        locale: req.body.locale,
        includeExamples: req.body.includeExamples ?? true,
        maxLength: req.body.maxLength,
      };

      const explanation = await verdictExplainerService!.explainVerdict(verdict, context);

      logger.info({
        verdictAction: verdict.action,
        audience: context.audience,
        userId: getUserId(req),
      }, 'Verdict explained');

      res.json(wrapResponse(explanation, req));
    } catch (error: any) {
      handleError(error, res, 'explainVerdict');
    }
  }
);

/**
 * @swagger
 * /api/v4/ai/verdict-explanations/batch:
 *   post:
 *     summary: Generate explanations for multiple verdicts
 *     tags: [AI Governance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - verdicts
 *             properties:
 *               verdicts:
 *                 type: array
 *                 items:
 *                   type: object
 *               audience:
 *                 type: string
 *               tone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Batch of explained verdicts
 */
router.post(
  '/verdict-explanations/batch',
  requirePermission('ai:explanations:generate'),
  async (req: Request, res: Response) => {
    try {
      const verdicts: GovernanceVerdict[] = req.body.verdicts;
      const context: ExplanationContext = {
        audience: req.body.audience || 'end_user',
        tone: req.body.tone || 'friendly',
        locale: req.body.locale,
        includeExamples: req.body.includeExamples ?? false,
      };

      if (verdicts.length > 50) {
        return res.status(400).json({
          error: {
            code: 'BATCH_TOO_LARGE',
            message: 'Maximum 50 verdicts per batch',
          },
        });
      }

      const explanations = await verdictExplainerService!.batchExplain(verdicts, context);

      logger.info({
        count: explanations.length,
        audience: context.audience,
        userId: getUserId(req),
      }, 'Batch verdicts explained');

      res.json(wrapResponse(explanations, req));
    } catch (error: any) {
      handleError(error, res, 'batchExplain');
    }
  }
);

// =============================================================================
// Anomaly Detection Endpoints
// =============================================================================

/**
 * @swagger
 * /api/v4/ai/anomalies/detect:
 *   post:
 *     summary: Detect behavioral anomalies
 *     tags: [AI Governance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - timeRange
 *             properties:
 *               entityTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [user, service, tenant, resource]
 *               anomalyTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *               minSeverity:
 *                 type: string
 *                 enum: [info, low, medium, high, critical]
 *               timeRange:
 *                 type: object
 *                 required:
 *                   - start
 *                   - end
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date-time
 *                   end:
 *                     type: string
 *                     format: date-time
 *     responses:
 *       200:
 *         description: Detected anomalies
 */
router.post(
  '/anomalies/detect',
  requirePermission('ai:anomalies:detect'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const scope: AnomalyDetectionScope = {
        tenantIds: [tenantId],
        entityTypes: req.body.entityTypes,
        anomalyTypes: req.body.anomalyTypes,
        minSeverity: req.body.minSeverity,
        timeRange: req.body.timeRange,
      };

      const anomalies = await anomalyService!.detectAnomalies(scope);

      logger.info({
        tenantId,
        anomalyCount: anomalies.length,
        userId: getUserId(req),
      }, 'Anomalies detected');

      res.json(wrapResponse(anomalies, req));
    } catch (error: any) {
      handleError(error, res, 'detectAnomalies');
    }
  }
);

/**
 * @swagger
 * /api/v4/ai/anomalies:
 *   get:
 *     summary: List anomalies
 *     tags: [AI Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, investigating, confirmed, false_positive, mitigated, escalated]
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [info, low, medium, high, critical]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of anomalies
 */
router.get(
  '/anomalies',
  requirePermission('ai:anomalies:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const scope: AnomalyDetectionScope = {
        tenantIds: [tenantId],
        minSeverity: req.query.severity as BehavioralAnomaly['severity'],
        timeRange: {
          start: thirtyDaysAgo.toISOString(),
          end: now.toISOString(),
        },
      };

      const anomalies = await anomalyService!.detectAnomalies(scope);

      // Filter by status if provided
      const filteredAnomalies = (req.query.status as any)
        ? anomalies.filter(a => a.status === (req.query.status as any))
        : anomalies;

      // Apply pagination
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 20;
      const paginated = filteredAnomalies.slice(offset, offset + limit);

      res.json(wrapResponse({
        anomalies: paginated,
        total: filteredAnomalies.length,
      }, req));
    } catch (error: any) {
      handleError(error, res, 'listAnomalies');
    }
  }
);

/**
 * @swagger
 * /api/v4/ai/anomalies/{id}:
 *   get:
 *     summary: Get anomaly details
 *     tags: [AI Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Anomaly details
 *       404:
 *         description: Anomaly not found
 */
router.get(
  '/anomalies/:id',
  requirePermission('ai:anomalies:read'),
  async (req: Request, res: Response) => {
    try {
      const anomaly = await anomalyService!.getAnomaly(req.params.id);

      if (!anomaly) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Anomaly not found: ${req.params.id}`,
          },
        });
      }

      res.json(wrapResponse(anomaly, req));
    } catch (error: any) {
      handleError(error, res, 'getAnomaly');
    }
  }
);

/**
 * @swagger
 * /api/v4/ai/anomalies/{id}/status:
 *   patch:
 *     summary: Update anomaly status
 *     tags: [AI Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [investigating, confirmed, false_positive, mitigated, escalated]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch(
  '/anomalies/:id/status',
  requirePermission('ai:anomalies:update'),
  async (req: Request, res: Response) => {
    try {
      const status: AnomalyStatus = req.body.status;
      const notes: string = req.body.notes;

      const anomaly = await anomalyService!.updateAnomalyStatus(
        req.params.id,
        status,
        notes
      );

      logger.info({
        anomalyId: req.params.id,
        newStatus: status,
        updatedBy: getUserId(req),
      }, 'Anomaly status updated');

      res.json(wrapResponse(anomaly, req));
    } catch (error: any) {
      handleError(error, res, 'updateAnomalyStatus');
    }
  }
);

/**
 * @swagger
 * /api/v4/ai/anomalies/{id}/resolve:
 *   post:
 *     summary: Resolve an anomaly
 *     tags: [AI Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resolution
 *             properties:
 *               resolution:
 *                 type: string
 *                 enum: [confirmed_threat, false_positive, acceptable_risk, mitigated]
 *               notes:
 *                 type: string
 *               actionsTaken:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Anomaly resolved
 */
router.post(
  '/anomalies/:id/resolve',
  requirePermission('ai:anomalies:resolve'),
  async (req: Request, res: Response) => {
    try {
      const resolution: AnomalyResolution = {
        resolvedBy: getUserId(req),
        resolvedAt: new Date().toISOString(),
        resolution: req.body.resolution,
        notes: req.body.notes || '',
        actionsTaken: req.body.actionsTaken || [],
      };

      const anomaly = await anomalyService!.resolveAnomaly(req.params.id, resolution);

      logger.info({
        anomalyId: req.params.id,
        resolution: resolution.resolution,
        resolvedBy: resolution.resolvedBy,
      }, 'Anomaly resolved');

      res.json(wrapResponse(anomaly, req));
    } catch (error: any) {
      handleError(error, res, 'resolveAnomaly');
    }
  }
);

/**
 * @swagger
 * /api/v4/ai/anomalies/trends:
 *   get:
 *     summary: Get anomaly trends
 *     tags: [AI Governance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Anomaly trends
 */
router.get(
  '/anomalies/trends',
  requirePermission('ai:anomalies:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const endDate = (req.query.endDate as any)
        ? new Date(req.query.endDate as string)
        : new Date();
      const startDate = (req.query.startDate as any)
        ? new Date(req.query.startDate as string)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const trends = await anomalyService!.getAnomalyTrends(tenantId, {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });

      res.json(wrapResponse(trends, req));
    } catch (error: any) {
      handleError(error, res, 'getAnomalyTrends');
    }
  }
);

// =============================================================================
// Health & Status Endpoints
// =============================================================================

/**
 * @swagger
 * /api/v4/ai/health:
 *   get:
 *     summary: AI Governance service health check
 *     tags: [AI Governance]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const status = {
      status: 'healthy',
      services: {
        policySuggestions: policySuggestionService ? 'initialized' : 'not_initialized',
        verdictExplainer: verdictExplainerService ? 'initialized' : 'not_initialized',
        anomalyDetection: anomalyService ? 'initialized' : 'not_initialized',
      },
      timestamp: new Date().toISOString(),
      version: '4.0.0',
    };

    res.json(status);
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
export { router as aiGovernanceV4Router };
