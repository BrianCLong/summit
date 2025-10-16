import { Router, Request, Response } from 'express';
import { CoherenceService } from './coherenceService';
import { z } from 'zod';
import logger from '../utils/logger';
import rateLimit from 'express-rate-limit';

// Request schemas
const SignalIngestSchema = z.object({
  tenantId: z.string().min(1),
  type: z.string().min(1),
  value: z.number().min(-1000).max(1000),
  weight: z.number().optional().default(1.0),
  source: z.string().min(1),
  ts: z
    .string()
    .datetime()
    .optional()
    .default(() => new Date().toISOString()),
  signalId: z.string().optional(),
  metadata: z.object({}).optional(),
});

const AnalysisRequestSchema = z.object({
  tenantId: z.string().min(1),
  timeRange: z
    .object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    })
    .optional(),
  forceRefresh: z.boolean().optional().default(false),
  includeRealTimeAnalysis: z.boolean().optional().default(true),
});

const ConfigurationSchema = z.object({
  tenantId: z.string().min(1),
  analysisInterval: z.number().min(1).max(1440).optional(), // 1 minute to 24 hours
  signalRetention: z.number().min(1).max(3650).optional(), // 1 day to 10 years
  confidenceThreshold: z.number().min(0).max(1).optional(),
  anomalyThreshold: z.number().min(0.5).max(5).optional(),
  enableRealTimeAnalysis: z.boolean().optional(),
  enablePredictiveAnalysis: z.boolean().optional(),
  notificationSettings: z
    .object({
      scoreThreshold: z.number().min(0).max(1).optional(),
      riskThreshold: z.number().min(0).max(1).optional(),
      enableSlack: z.boolean().optional(),
      enableEmail: z.boolean().optional(),
    })
    .optional(),
});

const MissionContextSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  priority: z
    .enum(['low', 'medium', 'high', 'critical'])
    .optional()
    .default('medium'),
  classification: z
    .enum(['public', 'internal', 'confidential', 'secret'])
    .optional()
    .default('internal'),
  objectives: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        type: z.enum(['intelligence', 'operational', 'strategic', 'tactical']),
        priority: z.number().min(1).max(10),
      }),
    )
    .optional(),
  timeline: z
    .object({
      startDate: z.string().datetime(),
      plannedEndDate: z.string().datetime(),
    })
    .optional(),
});

// Rate limiting
const analysisRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 analysis requests per windowMs
  message: 'Too many analysis requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const ingestRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // Limit each IP to 1000 signals per minute
  message: 'Signal ingestion rate limit exceeded, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

export function createCoherenceRoutes(
  coherenceService: CoherenceService,
): Router {
  const router = Router();

  // Health check endpoint
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        components: {
          coherenceService: 'healthy',
          database: 'healthy',
          cache: 'healthy',
        },
      };

      res.json(health);
    } catch (error) {
      logger.error('Health check failed', { error });
      res.status(500).json({
        status: 'unhealthy',
        error: 'Internal server error',
      });
    }
  });

  // Signal ingestion endpoint
  router.post(
    '/signals/ingest',
    ingestRateLimit,
    async (req: Request, res: Response) => {
      try {
        const validatedInput = SignalIngestSchema.parse(req.body);

        const result = await coherenceService.ingestSignal(
          validatedInput.tenantId,
          validatedInput,
        );

        logger.info('Signal ingested via API', {
          tenantId: validatedInput.tenantId,
          signalId: result.signalId,
          type: validatedInput.type,
          triggeredAnalysis: result.triggeredAnalysis,
        });

        res.status(201).json(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.warn('Invalid signal ingestion request', {
            errors: error.errors,
          });
          return res.status(400).json({
            success: false,
            error: 'Invalid request format',
            details: error.errors,
          });
        }

        logger.error('Signal ingestion failed', { error });
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    },
  );

  // Batch signal ingestion
  router.post(
    '/signals/batch',
    ingestRateLimit,
    async (req: Request, res: Response) => {
      try {
        const { tenantId, signals } = req.body;

        if (!tenantId || !Array.isArray(signals)) {
          return res.status(400).json({
            success: false,
            error: 'tenantId and signals array are required',
          });
        }

        if (signals.length > 100) {
          return res.status(400).json({
            success: false,
            error: 'Batch size limited to 100 signals',
          });
        }

        const results = [];
        let successCount = 0;
        let failureCount = 0;

        for (const signalData of signals) {
          try {
            const validatedSignal = SignalIngestSchema.parse({
              ...signalData,
              tenantId,
            });
            const result = await coherenceService.ingestSignal(
              tenantId,
              validatedSignal,
            );
            results.push({ success: true, signalId: result.signalId });
            successCount++;
          } catch (error) {
            results.push({
              success: false,
              error:
                error instanceof z.ZodError
                  ? 'Validation error'
                  : 'Processing error',
              signalData: signalData.signalId || 'unknown',
            });
            failureCount++;
          }
        }

        logger.info('Batch signal ingestion completed', {
          tenantId,
          totalSignals: signals.length,
          successCount,
          failureCount,
        });

        res.json({
          success: true,
          summary: {
            total: signals.length,
            successful: successCount,
            failed: failureCount,
          },
          results,
        });
      } catch (error) {
        logger.error('Batch signal ingestion failed', { error });
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    },
  );

  // Coherence analysis endpoint
  router.post(
    '/analysis',
    analysisRateLimit,
    async (req: Request, res: Response) => {
      try {
        const validatedInput = AnalysisRequestSchema.parse(req.body);

        const result = await coherenceService.analyzeCoherence(
          validatedInput.tenantId,
          {
            timeRange: validatedInput.timeRange,
            forceRefresh: validatedInput.forceRefresh,
            includeRealTimeAnalysis: validatedInput.includeRealTimeAnalysis,
          },
        );

        logger.info('Coherence analysis completed via API', {
          tenantId: validatedInput.tenantId,
          analysisId: result.analysisId,
          coherenceScore: result.coherenceScore,
          signalCount: result.metadata.signalCount,
        });

        res.json(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.warn('Invalid analysis request', { errors: error.errors });
          return res.status(400).json({
            error: 'Invalid request format',
            details: error.errors,
          });
        }

        logger.error('Coherence analysis failed', { error });
        res.status(500).json({
          error: 'Internal server error',
        });
      }
    },
  );

  // Get coherence status
  router.get('/status/:tenantId', async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;

      if (!tenantId) {
        return res.status(400).json({
          error: 'tenantId is required',
        });
      }

      const status = await coherenceService.getCoherenceStatus(tenantId);

      res.json(status);
    } catch (error) {
      logger.error('Failed to get coherence status', {
        error,
        tenantId: req.params.tenantId,
      });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  });

  // Configuration management
  router.post('/configuration', async (req: Request, res: Response) => {
    try {
      const validatedInput = ConfigurationSchema.parse(req.body);

      const { tenantId, ...config } = validatedInput;

      await coherenceService.configureTenant(tenantId, config);

      logger.info('Tenant configuration updated', { tenantId, config });

      res.json({
        success: true,
        message: 'Configuration updated successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Invalid configuration request', { errors: error.errors });
        return res.status(400).json({
          success: false,
          error: 'Invalid configuration format',
          details: error.errors,
        });
      }

      logger.error('Configuration update failed', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Mission management endpoints
  router.post('/missions', async (req: Request, res: Response) => {
    try {
      const validatedInput = MissionContextSchema.parse(req.body);

      const { tenantId, ...missionData } = validatedInput;

      const mission = await coherenceService
        .getMissionVault()
        .createMissionContext(tenantId, missionData);

      logger.info('Mission created via API', {
        tenantId,
        missionId: mission.missionId,
        name: mission.name,
      });

      res.status(201).json(mission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Invalid mission creation request', {
          errors: error.errors,
        });
        return res.status(400).json({
          error: 'Invalid mission format',
          details: error.errors,
        });
      }

      logger.error('Mission creation failed', { error });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  });

  router.get('/missions/:tenantId', async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const { missionId } = req.query;

      if (!tenantId) {
        return res.status(400).json({
          error: 'tenantId is required',
        });
      }

      if (missionId) {
        // Get specific mission
        const mission = await coherenceService
          .getMissionVault()
          .getMissionContext(tenantId, missionId as string);
        if (!mission) {
          return res.status(404).json({
            error: 'Mission not found',
          });
        }
        res.json(mission);
      } else {
        // Get all active missions
        const missions = await coherenceService
          .getMissionVault()
          .getActiveMissions(tenantId);
        res.json({
          missions,
          count: missions.length,
        });
      }
    } catch (error) {
      logger.error('Failed to get missions', {
        error,
        tenantId: req.params.tenantId,
      });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  });

  // Activity fingerprints endpoint
  router.get('/activity/:tenantId', async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const {
        limit = 50,
        minConfidence = 0.3,
        types,
        startTime,
        endTime,
      } = req.query;

      if (!tenantId) {
        return res.status(400).json({
          error: 'tenantId is required',
        });
      }

      const options: any = {
        limit: parseInt(limit as string),
        minConfidence: parseFloat(minConfidence as string),
      };

      if (types) {
        options.types = (types as string).split(',');
      }

      if (startTime && endTime) {
        options.timeRange = {
          start: startTime as string,
          end: endTime as string,
        };
      }

      const fingerprints = await coherenceService
        .getActivityIndex()
        .getActivityFingerprints(tenantId, options);

      res.json({
        fingerprints,
        count: fingerprints.length,
        options,
      });
    } catch (error) {
      logger.error('Failed to get activity fingerprints', {
        error,
        tenantId: req.params.tenantId,
      });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  });

  // Narrative impacts endpoint
  router.get('/narratives/:tenantId', async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const {
        limit = 20,
        minMagnitude = 0.1,
        impactTypes,
        startTime,
        endTime,
      } = req.query;

      if (!tenantId) {
        return res.status(400).json({
          error: 'tenantId is required',
        });
      }

      const options: any = {
        limit: parseInt(limit as string),
        minMagnitude: parseFloat(minMagnitude as string),
      };

      if (impactTypes) {
        options.impactTypes = (impactTypes as string).split(',');
      }

      if (startTime && endTime) {
        options.timeRange = {
          start: startTime as string,
          end: endTime as string,
        };
      }

      const impacts = await coherenceService
        .getNarrativeModel()
        .getNarrativeImpacts(tenantId, options);

      res.json({
        impacts,
        count: impacts.length,
        options,
      });
    } catch (error) {
      logger.error('Failed to get narrative impacts', {
        error,
        tenantId: req.params.tenantId,
      });
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  });

  // Mission health assessment
  router.get(
    '/missions/:tenantId/:missionId/health',
    async (req: Request, res: Response) => {
      try {
        const { tenantId, missionId } = req.params;

        if (!tenantId || !missionId) {
          return res.status(400).json({
            error: 'tenantId and missionId are required',
          });
        }

        const health = await coherenceService
          .getMissionVault()
          .assessMissionHealth(tenantId, missionId);

        res.json(health);
      } catch (error) {
        logger.error('Failed to assess mission health', {
          error,
          tenantId: req.params.tenantId,
          missionId: req.params.missionId,
        });
        res.status(500).json({
          error: 'Internal server error',
        });
      }
    },
  );

  // Debugging and testing endpoints (remove in production)
  if (process.env.NODE_ENV !== 'production') {
    router.post(
      '/debug/simulate-update/:tenantId',
      async (req: Request, res: Response) => {
        try {
          const { tenantId } = req.params;
          const { type = 'coherence' } = req.body;

          const subscriptionManager = coherenceService.getSubscriptionManager();

          let result;
          if (type === 'coherence') {
            result =
              await subscriptionManager.simulateCoherenceUpdate(tenantId);
          } else if (type === 'activity') {
            result = await subscriptionManager.simulateActivityUpdate(tenantId);
          } else if (type === 'narrative') {
            result =
              await subscriptionManager.simulateNarrativeUpdate(tenantId);
          } else {
            return res.status(400).json({ error: 'Invalid simulation type' });
          }

          res.json({
            success: true,
            simulation: result,
          });
        } catch (error) {
          logger.error('Simulation failed', { error });
          res.status(500).json({
            error: 'Simulation failed',
          });
        }
      },
    );

    router.get(
      '/debug/subscription-counts',
      async (req: Request, res: Response) => {
        try {
          const subscriptionManager = coherenceService.getSubscriptionManager();
          const counts = subscriptionManager.getSubscriptionCounts();

          res.json({
            subscriptionCounts: counts,
            totalSubscriptions: Object.values(counts).reduce(
              (sum, count) => sum + count,
              0,
            ),
          });
        } catch (error) {
          logger.error('Failed to get subscription counts', { error });
          res.status(500).json({
            error: 'Failed to get subscription counts',
          });
        }
      },
    );
  }

  // Error handling middleware
  router.use((error: any, req: Request, res: Response, next: any) => {
    logger.error('Coherence API error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
    });

    res.status(500).json({
      error: 'Internal server error',
      path: req.path,
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
