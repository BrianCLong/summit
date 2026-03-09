import { Express, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { signalService } from '../services/signalService.js';
import { logger } from '../observability/logger.js';
import { incrementCounter, recordHistogram } from '../observability/metrics.js';
import { config } from '../../config/environment.js';

// Signal input validation schema
const signalSchema = Joi.object({
  tenantId: Joi.string().required().max(255),
  type: Joi.string().required().max(100),
  value: Joi.number().required().min(-1000).max(1000),
  weight: Joi.number().optional().min(0).max(100).default(1.0),
  source: Joi.string().required().max(255),
  ts: Joi.date()
    .iso()
    .optional()
    .default(() => new Date()),
  metadata: Joi.object().optional(),
});

const batchSignalSchema = Joi.object({
  signals: Joi.array().items(signalSchema).min(1).max(1000).required(),
});

// Rate limiting middleware
const createRateLimiter = (
  windowMs: number,
  max: number,
  keyGenerator?: (req: Request) => string,
) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: keyGenerator || ((req) => req.ip),
    message: {
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      incrementCounter('http_requests_rate_limited_total', {
        endpoint: req.path,
        tenant_id: req.body?.tenantId || 'unknown',
      });

      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        tenantId: req.body?.tenantId,
        userAgent: req.get('User-Agent'),
      });

      res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
};

// Global rate limiter
const globalLimiter = createRateLimiter(60 * 1000, config.CONDUCTOR_RPS_MAX); // 1000 RPM global

// Per-tenant rate limiter
const tenantLimiter = createRateLimiter(
  60 * 1000,
  Math.floor(config.CONDUCTOR_RPS_MAX / 10), // 100 RPM per tenant
  (req) => req.body?.tenantId || req.ip,
);

// Authentication middleware
const authenticateRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing or invalid Authorization header',
      });
    }

    const token = authHeader.substring(7);

    // JWT validation would go here - for now, simple validation
    if (!token || token.length < 10) {
      return res.status(401).json({
        error: 'Invalid token',
      });
    }

    // Extract tenant from token (simplified)
    // In production, this would decode and validate the JWT
    req.user = {
      id: 'system',
      tenantId: req.body?.tenantId || 'default',
      scopes: ['coherence:write'],
    };

    next();
  } catch (error) {
    logger.error('Authentication error', { error: error.message });
    res.status(401).json({
      error: 'Authentication failed',
    });
  }
};

// Request logging middleware
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info('HTTP request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      tenantId: req.body?.tenantId,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    // Record metrics
    incrementCounter('http_requests_total', {
      method: req.method,
      status_code: res.statusCode.toString(),
      endpoint: req.path,
    });

    recordHistogram('http_request_duration_seconds', duration / 1000, {
      method: req.method,
      status_code: res.statusCode.toString(),
      endpoint: req.path,
    });
  });

  next();
};

// Provenance middleware - attaches metadata to all requests
const attachProvenance = (req: Request, res: Response, next: NextFunction) => {
  const provenance = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    source: 'http-ingest',
    requestId: req.requestId,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    purpose: 'benchmarking',
    retention: 'standard-365d',
    license: 'Restricted-TOS',
    residency: 'US',
  };

  req.provenance = provenance;
  next();
};

// Single signal ingestion endpoint
const ingestSignal = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Validate request body
    const { error, value: validatedSignal } = signalSchema.validate(req.body);

    if (error) {
      incrementCounter('signal_validation_errors_total', {
        tenant_id: req.body?.tenantId || 'unknown',
        error_type: 'validation',
      });

      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map((d) => d.message),
      });
    }

    // Check tenant authorization
    if (
      req.user.tenantId !== validatedSignal.tenantId &&
      req.user.tenantId !== 'system'
    ) {
      incrementCounter('signal_authorization_errors_total', {
        tenant_id: validatedSignal.tenantId,
      });

      return res.status(403).json({
        error: 'Unauthorized to write signals for this tenant',
      });
    }

    // Attach provenance
    const signalWithProvenance = {
      ...validatedSignal,
      provenance: req.provenance,
    };

    // Process signal
    const result = await signalService.ingestSignal(signalWithProvenance);

    // Record success metrics
    incrementCounter('signals_ingested_total', {
      tenant_id: validatedSignal.tenantId,
      signal_type: validatedSignal.type,
      source: validatedSignal.source,
    });

    recordHistogram(
      'signal_processing_duration_seconds',
      (Date.now() - startTime) / 1000,
      {
        tenant_id: validatedSignal.tenantId,
        signal_type: validatedSignal.type,
      },
    );

    logger.info('Signal ingested successfully', {
      requestId: req.requestId,
      tenantId: validatedSignal.tenantId,
      signalType: validatedSignal.type,
      signalId: result.signalId,
      provenanceId: req.provenance.id,
      duration: Date.now() - startTime,
    });

    res.status(201).json({
      success: true,
      signalId: result.signalId,
      provenanceId: req.provenance.id,
      processed: true,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    incrementCounter('signal_processing_errors_total', {
      tenant_id: req.body?.tenantId || 'unknown',
      error_type: error.name || 'unknown',
    });

    logger.error('Signal ingestion failed', {
      requestId: req.requestId,
      error: error.message,
      stack: error.stack,
      tenantId: req.body?.tenantId,
      duration,
    });

    res.status(500).json({
      error: 'Signal ingestion failed',
      requestId: req.requestId,
    });
  }
};

// Batch signal ingestion endpoint
const ingestBatchSignals = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Validate request body
    const { error, value: validatedBatch } = batchSignalSchema.validate(
      req.body,
    );

    if (error) {
      incrementCounter('batch_validation_errors_total', {
        error_type: 'validation',
      });

      return res.status(400).json({
        error: 'Batch validation failed',
        details: error.details.map((d) => d.message),
      });
    }

    const { signals } = validatedBatch;

    // Check all signals belong to authorized tenants
    const unauthorizedSignals = signals.filter(
      (s) => req.user.tenantId !== s.tenantId && req.user.tenantId !== 'system',
    );

    if (unauthorizedSignals.length > 0) {
      incrementCounter('batch_authorization_errors_total', {
        unauthorized_count: unauthorizedSignals.length,
      });

      return res.status(403).json({
        error: 'Unauthorized to write signals for some tenants',
        unauthorizedTenants: [
          ...new Set(unauthorizedSignals.map((s) => s.tenantId)),
        ],
      });
    }

    // Attach provenance to all signals
    const signalsWithProvenance = signals.map((signal) => ({
      ...signal,
      provenance: req.provenance,
    }));

    // Process batch
    const results = await signalService.ingestBatchSignals(
      signalsWithProvenance,
    );

    // Record success metrics
    incrementCounter('batch_signals_ingested_total', {
      batch_size: signals.length,
    });

    signals.forEach((signal) => {
      incrementCounter('signals_ingested_total', {
        tenant_id: signal.tenantId,
        signal_type: signal.type,
        source: signal.source,
      });
    });

    recordHistogram(
      'batch_processing_duration_seconds',
      (Date.now() - startTime) / 1000,
      {
        batch_size: signals.length,
      },
    );

    logger.info('Batch signals ingested successfully', {
      requestId: req.requestId,
      batchSize: signals.length,
      successCount: results.successCount,
      errorCount: results.errorCount,
      provenanceId: req.provenance.id,
      duration: Date.now() - startTime,
    });

    res.status(201).json({
      success: true,
      processed: results.successCount,
      errors: results.errorCount,
      provenanceId: req.provenance.id,
      results: results.details,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    incrementCounter('batch_processing_errors_total', {
      error_type: error.name || 'unknown',
    });

    logger.error('Batch signal ingestion failed', {
      requestId: req.requestId,
      error: error.message,
      stack: error.stack,
      duration,
    });

    res.status(500).json({
      error: 'Batch signal ingestion failed',
      requestId: req.requestId,
    });
  }
};

// Health check for ingest endpoint
const ingestHealthCheck = (req: Request, res: Response) => {
  res.json({
    service: 'coherence-signal-ingest',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: config.APP_VERSION,
    endpoints: [
      'POST /v1/coherence/signals',
      'POST /v1/coherence/signals/batch',
    ],
  });
};

export function setupIngest(app: Express): void {
  // Apply middleware stack
  app.use('/v1/coherence', requestLogger);
  app.use('/v1/coherence', globalLimiter);
  app.use('/v1/coherence', tenantLimiter);
  app.use('/v1/coherence', authenticateRequest);
  app.use('/v1/coherence', attachProvenance);

  // Register endpoints
  app.post('/v1/coherence/signals', ingestSignal);
  app.post('/v1/coherence/signals/batch', ingestBatchSignals);
  app.get('/v1/coherence/health', ingestHealthCheck);

  logger.info('Coherence signal ingest endpoints registered', {
    endpoints: [
      'POST /v1/coherence/signals',
      'POST /v1/coherence/signals/batch',
      'GET /v1/coherence/health',
    ],
  });
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: {
        id: string;
        tenantId: string;
        scopes: string[];
      };
      provenance?: {
        id: string;
        timestamp: string;
        source: string;
        requestId: string;
        userAgent?: string;
        ip: string;
        purpose: string;
        retention: string;
        license: string;
        residency: string;
      };
    }
  }
}
