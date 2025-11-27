/**
 * Threat Library Service - HTTP Server
 *
 * REST API for the threat pattern library.
 * Provides endpoints for threat archetypes, TTPs, patterns, and indicators.
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import { pino } from 'pino';
import pinoHttp from 'pino-http';
import { ZodError } from 'zod';
import {
  ThreatLibraryService,
  createService,
} from './service.js';
import {
  patternEvaluationRequestSchema,
  paginationSchema,
  threatFilterSchema,
  patternFilterSchema,
  ttpFilterSchema,
} from './types.js';
import {
  ThreatLibraryError,
  NotFoundError,
  ValidationError,
  isKnownError,
  toThreatLibraryError,
} from './errors.js';

// ============================================================================
// LOGGER CONFIGURATION
// ============================================================================

const logger = pino({
  name: 'threat-library-service',
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

// ============================================================================
// APPLICATION SETUP
// ============================================================================

const app = express();
const service = createService();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/health' || req.url === '/health/ready',
    },
  })
);

// Request ID middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] ?? crypto.randomUUID();
  next();
});

// ============================================================================
// HEALTH ENDPOINTS
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'threat-library-service',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    const stats = await service.getLibraryStatistics();
    res.json({
      status: 'ready',
      service: 'threat-library-service',
      statistics: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      service: 'threat-library-service',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// THREAT ARCHETYPE ENDPOINTS
// ============================================================================

/**
 * List threat archetypes
 * GET /api/v1/threats
 */
app.get('/api/v1/threats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filterResult = threatFilterSchema.safeParse(req.query);
    const paginationResult = paginationSchema.safeParse({
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });

    const filter = filterResult.success ? filterResult.data : {};
    const pagination = paginationResult.success
      ? paginationResult.data
      : { page: 1, limit: 20 };

    const result = await service.listThreats(filter, pagination);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get threat archetype by ID
 * GET /api/v1/threats/:id
 */
app.get('/api/v1/threats/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const threat = await service.getThreatById(req.params.id);
    res.json({
      success: true,
      data: threat,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create threat archetype
 * POST /api/v1/threats
 */
app.post('/api/v1/threats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const author = (req.headers['x-author'] as string) ?? 'system';
    const threat = await service.createThreat(req.body, { author });
    res.status(201).json({
      success: true,
      data: threat,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update threat archetype
 * PUT /api/v1/threats/:id
 */
app.put('/api/v1/threats/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const author = (req.headers['x-author'] as string) ?? 'system';
    const description = req.headers['x-change-description'] as string | undefined;
    const threat = await service.updateThreat(req.params.id, req.body, {
      author,
      description,
    });
    res.json({
      success: true,
      data: threat,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Deprecate threat archetype
 * POST /api/v1/threats/:id/deprecate
 */
app.post(
  '/api/v1/threats/:id/deprecate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const author = (req.headers['x-author'] as string) ?? 'system';
      const threat = await service.deprecateThreat(req.params.id, { author });
      res.json({
        success: true,
        data: threat,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Archive threat archetype
 * DELETE /api/v1/threats/:id
 */
app.delete('/api/v1/threats/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const author = (req.headers['x-author'] as string) ?? 'system';
    await service.archiveThreat(req.params.id, { author });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// PATTERN ENDPOINTS
// ============================================================================

/**
 * List patterns for a threat
 * GET /api/v1/threats/:threatId/patterns
 */
app.get(
  '/api/v1/threats/:threatId/patterns',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patterns = await service.listPatternsForThreat(req.params.threatId);
      res.json({
        success: true,
        data: patterns,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * List all patterns
 * GET /api/v1/patterns
 */
app.get('/api/v1/patterns', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filterResult = patternFilterSchema.safeParse(req.query);
    const paginationResult = paginationSchema.safeParse({
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });

    const filter = filterResult.success ? filterResult.data : {};
    const pagination = paginationResult.success
      ? paginationResult.data
      : { page: 1, limit: 20 };

    const result = await service.listPatterns(filter, pagination);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get pattern by ID
 * GET /api/v1/patterns/:id
 */
app.get('/api/v1/patterns/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pattern = await service.getPatternById(req.params.id);
    res.json({
      success: true,
      data: pattern,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create pattern
 * POST /api/v1/patterns
 */
app.post('/api/v1/patterns', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const author = (req.headers['x-author'] as string) ?? 'system';
    const pattern = await service.createPattern(req.body, { author });
    res.status(201).json({
      success: true,
      data: pattern,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update pattern
 * PUT /api/v1/patterns/:id
 */
app.put('/api/v1/patterns/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const author = (req.headers['x-author'] as string) ?? 'system';
    const description = req.headers['x-change-description'] as string | undefined;
    const pattern = await service.updatePattern(req.params.id, req.body, {
      author,
      description,
    });
    res.json({
      success: true,
      data: pattern,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Validate pattern coverage
 * GET /api/v1/patterns/:id/validate
 */
app.get(
  '/api/v1/patterns/:id/validate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = await service.validatePatternCoverage(req.params.id);
      res.json({
        success: true,
        data: validation,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// TTP ENDPOINTS
// ============================================================================

/**
 * List TTPs
 * GET /api/v1/ttps
 */
app.get('/api/v1/ttps', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filterResult = ttpFilterSchema.safeParse(req.query);
    const paginationResult = paginationSchema.safeParse({
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });

    const filter = filterResult.success ? filterResult.data : {};
    const pagination = paginationResult.success
      ? paginationResult.data
      : { page: 1, limit: 20 };

    const result = await service.listTTPs(filter, pagination);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get TTP by ID
 * GET /api/v1/ttps/:id
 */
app.get('/api/v1/ttps/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ttp = await service.getTTPById(req.params.id);
    res.json({
      success: true,
      data: ttp,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get TTPs by technique ID
 * GET /api/v1/ttps/technique/:techniqueId
 */
app.get(
  '/api/v1/ttps/technique/:techniqueId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ttps = await service.getTTPsByTechnique(req.params.techniqueId);
      res.json({
        success: true,
        data: ttps,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get TTPs for a threat
 * GET /api/v1/threats/:threatId/ttps
 */
app.get(
  '/api/v1/threats/:threatId/ttps',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ttps = await service.getTTPsForThreat(req.params.threatId);
      res.json({
        success: true,
        data: ttps,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Create TTP
 * POST /api/v1/ttps
 */
app.post('/api/v1/ttps', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const author = (req.headers['x-author'] as string) ?? 'system';
    const ttp = await service.createTTP(req.body, { author });
    res.status(201).json({
      success: true,
      data: ttp,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update TTP
 * PUT /api/v1/ttps/:id
 */
app.put('/api/v1/ttps/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const author = (req.headers['x-author'] as string) ?? 'system';
    const description = req.headers['x-change-description'] as string | undefined;
    const ttp = await service.updateTTP(req.params.id, req.body, {
      author,
      description,
    });
    res.json({
      success: true,
      data: ttp,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// INDICATOR ENDPOINTS
// ============================================================================

/**
 * List indicators
 * GET /api/v1/indicators
 */
app.get('/api/v1/indicators', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const paginationResult = paginationSchema.safeParse({
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });

    const pagination = paginationResult.success
      ? paginationResult.data
      : { page: 1, limit: 20 };

    const result = await service.listIndicators(pagination);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get indicator by ID
 * GET /api/v1/indicators/:id
 */
app.get('/api/v1/indicators/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const indicator = await service.getIndicatorById(req.params.id);
    res.json({
      success: true,
      data: indicator,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get indicators for a threat
 * GET /api/v1/threats/:threatId/indicators
 */
app.get(
  '/api/v1/threats/:threatId/indicators',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const indicators = await service.getIndicatorsForThreat(req.params.threatId);
      res.json({
        success: true,
        data: indicators,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Create indicator
 * POST /api/v1/indicators
 */
app.post('/api/v1/indicators', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const author = (req.headers['x-author'] as string) ?? 'system';
    const indicator = await service.createIndicator(req.body, { author });
    res.status(201).json({
      success: true,
      data: indicator,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// DETECTION INTEGRATION ENDPOINTS
// ============================================================================

/**
 * Generate pattern evaluation spec
 * POST /api/v1/evaluate
 */
app.post('/api/v1/evaluate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = patternEvaluationRequestSchema.parse(req.body);
    const spec = await service.generatePatternEvaluationSpec(request);
    res.json({
      success: true,
      data: spec,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Generate bulk evaluation specs for a threat
 * POST /api/v1/threats/:threatId/evaluate
 */
app.post(
  '/api/v1/threats/:threatId/evaluate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const options = {
        maxMatches: req.body.maxMatches ?? 100,
        minConfidence: req.body.minConfidence ?? 0.5,
        includePartialMatches: req.body.includePartialMatches ?? false,
        timeout: req.body.timeout ?? 30000,
      };
      const specs = await service.generateBulkEvaluationSpecs(
        req.params.threatId,
        options
      );
      res.json({
        success: true,
        data: specs,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// EXPLANATION ENDPOINTS
// ============================================================================

/**
 * Generate explanation payload for a threat
 * GET /api/v1/threats/:threatId/explain
 */
app.get(
  '/api/v1/threats/:threatId/explain',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const explanation = await service.generateExplanationPayload(req.params.threatId);
      res.json({
        success: true,
        data: explanation,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Generate brief explanation for a threat
 * GET /api/v1/threats/:threatId/explain/brief
 */
app.get(
  '/api/v1/threats/:threatId/explain/brief',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const explanation = await service.generateBriefExplanation(req.params.threatId);
      res.json({
        success: true,
        data: explanation,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// STATISTICS ENDPOINT
// ============================================================================

/**
 * Get library statistics
 * GET /api/v1/statistics
 */
app.get('/api/v1/statistics', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await service.getLibraryStatistics();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
    timestamp: new Date().toISOString(),
  });
});

// Error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Request error');

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.errors,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle known errors
  if (isKnownError(err)) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle unknown errors
  const knownError = toThreatLibraryError(err);
  res.status(knownError.statusCode).json({
    success: false,
    error: {
      code: knownError.code,
      message:
        process.env.NODE_ENV === 'production'
          ? 'An internal error occurred'
          : knownError.message,
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// SERVER START
// ============================================================================

const PORT = parseInt(process.env.PORT ?? '3025', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  logger.info({ port: PORT, host: HOST }, 'Threat Library Service started');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
export { app, service };
