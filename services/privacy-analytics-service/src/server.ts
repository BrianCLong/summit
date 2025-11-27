/**
 * Privacy-Preserving Analytics Service - Main Server
 *
 * Provides REST API endpoints for privacy-preserving aggregate queries
 * with differential privacy, k-anonymity, and policy-based access control.
 */

import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

import { logger } from './utils/logger.js';
import { config } from './utils/config.js';
import { db } from './db/connections.js';
import { QueryExecutor } from './query/QueryExecutor.js';
import { GovernanceClient } from './governance/GovernanceClient.js';
import { predefinedMetrics } from './metrics/PredefinedMetrics.js';
import {
  AggregateQuerySchema,
  type AggregateQuery,
  type ExecutionContext,
  type PrivacyPolicy,
} from './types/index.js';

// ============================================================================
// Types
// ============================================================================

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenantId: string;
    roles: string[];
  };
}

// ============================================================================
// Application Setup
// ============================================================================

const app: Express = express();
const PORT = config.server.port;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

app.use(cors({
  origin: config.server.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Tenant-ID'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.server.rateLimitWindowMs,
  max: config.server.rateLimitMaxRequests,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  (req as AuthenticatedRequest).headers['x-request-id'] = requestId;

  const startTime = Date.now();
  res.on('finish', () => {
    logger.info({
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startTime,
      userAgent: req.headers['user-agent'],
    });
  });

  next();
});

// ============================================================================
// Service Instances
// ============================================================================

let queryExecutor: QueryExecutor;
let governanceClient: GovernanceClient;

// ============================================================================
// Authentication Middleware (simplified - integrate with your auth system)
// ============================================================================

function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // In production, validate JWT token and extract user info
  const authHeader = req.headers.authorization;
  const tenantId = req.headers['x-tenant-id'] as string;

  if (!tenantId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'X-Tenant-ID header is required',
    });
    return;
  }

  // Simplified auth - in production, validate token and extract claims
  req.user = {
    id: (req.headers['x-user-id'] as string) || 'anonymous',
    tenantId,
    roles: ((req.headers['x-user-roles'] as string) || 'user').split(','),
  };

  next();
}

function authorize(requiredRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (requiredRoles.length === 0) {
      next();
      return;
    }

    const hasRole = requiredRoles.some(role => req.user!.roles.includes(role));
    if (!hasRole) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Required roles: ${requiredRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
}

// ============================================================================
// Health Endpoints
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'privacy-analytics-service',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    const dbHealth = await db.checkHealth();
    const govHealth = await governanceClient.checkHealth();

    const isReady = dbHealth.postgres === 'healthy';

    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'not_ready',
      checks: {
        database: dbHealth,
        governance: govHealth,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

// ============================================================================
// Metrics Endpoint (Prometheus format)
// ============================================================================

app.get('/metrics', (_req: Request, res: Response) => {
  const budgetStates = queryExecutor?.getAllBudgetStates() || [];

  const metrics = `
# HELP privacy_analytics_requests_total Total number of analytics requests
# TYPE privacy_analytics_requests_total counter
privacy_analytics_requests_total{service="privacy-analytics"} 0

# HELP privacy_analytics_up Service health status
# TYPE privacy_analytics_up gauge
privacy_analytics_up{service="privacy-analytics"} 1

# HELP privacy_budget_spent_epsilon Total epsilon budget spent per tenant
# TYPE privacy_budget_spent_epsilon gauge
${budgetStates.map(b => `privacy_budget_spent_epsilon{tenant="${b.tenantId}"} ${b.spentBudget}`).join('\n')}

# HELP privacy_budget_remaining_epsilon Remaining epsilon budget per tenant
# TYPE privacy_budget_remaining_epsilon gauge
${budgetStates.map(b => `privacy_budget_remaining_epsilon{tenant="${b.tenantId}"} ${b.totalBudget - b.spentBudget}`).join('\n')}

# HELP privacy_queries_count Total queries per tenant
# TYPE privacy_queries_count counter
${budgetStates.map(b => `privacy_queries_count{tenant="${b.tenantId}"} ${b.queryCount}`).join('\n')}
`.trim();

  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(metrics);
});

// ============================================================================
// API Endpoints
// ============================================================================

// Apply authentication to all API routes
app.use('/api', authenticate);

/**
 * POST /api/v1/aggregate
 * Execute a privacy-preserving aggregate query
 */
app.post(
  '/api/v1/aggregate',
  authorize(['user', 'analyst', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    const requestId = req.headers['x-request-id'] as string;

    try {
      // Validate request body
      const parseResult = AggregateQuerySchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid query',
          details: parseResult.error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }

      const query: AggregateQuery = parseResult.data;

      // Build execution context with governance
      const context = await governanceClient.buildExecutionContext(
        req.user!.tenantId,
        req.user!.id,
        req.user!.roles,
        query,
        req.body.useCase
      );
      context.executionId = requestId;

      // Execute query
      const result = await queryExecutor.execute(query, context);

      // Return result
      res.status(result.status === 'success' || result.status === 'partial' ? 200 :
                 result.status === 'suppressed' ? 200 :
                 result.status === 'denied' ? 403 : 500).json(result);
    } catch (error) {
      logger.error({ requestId, error }, 'Aggregate query failed');
      res.status(500).json({
        error: 'Query execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      });
    }
  }
);

/**
 * GET /api/v1/metrics
 * List available predefined metrics
 */
app.get(
  '/api/v1/metrics',
  authorize([]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const metrics = predefinedMetrics.getByRoles(req.user!.roles);

      res.json({
        metrics: metrics.map(m => ({
          id: m.id,
          name: m.name,
          description: m.description,
          category: m.category,
          refreshInterval: m.refreshInterval,
          requiredRoles: m.requiredRoles,
        })),
        total: metrics.length,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to list metrics');
      res.status(500).json({ error: 'Failed to list metrics' });
    }
  }
);

/**
 * GET /api/v1/metrics/:id
 * Execute a predefined metric
 */
app.get(
  '/api/v1/metrics/:id',
  authorize([]),
  async (req: AuthenticatedRequest, res: Response) => {
    const requestId = req.headers['x-request-id'] as string;
    const metricId = req.params.id;

    try {
      const metric = predefinedMetrics.get(metricId);
      if (!metric) {
        res.status(404).json({
          error: 'Metric not found',
          metricId,
        });
        return;
      }

      // Check role access
      if (metric.requiredRoles.length > 0) {
        const hasAccess = metric.requiredRoles.some(r => req.user!.roles.includes(r));
        if (!hasAccess) {
          res.status(403).json({
            error: 'Forbidden',
            message: `Required roles: ${metric.requiredRoles.join(', ')}`,
          });
          return;
        }
      }

      // Check cache
      if (metric.cacheable) {
        const cached = await db.cacheGet<unknown>(`metric:${metricId}:${req.user!.tenantId}`);
        if (cached) {
          res.json({
            ...cached,
            cached: true,
          });
          return;
        }
      }

      // Build context with embedded policy
      const policies: PrivacyPolicy[] = [];
      if (metric.embeddedPolicy) {
        policies.push({
          id: `embedded-${metricId}`,
          name: `Embedded policy for ${metric.name}`,
          description: 'Embedded privacy policy',
          enabled: true,
          mechanism: metric.embeddedPolicy.mechanism!,
          kAnonymity: metric.embeddedPolicy.kAnonymity,
          differentialPrivacy: metric.embeddedPolicy.differentialPrivacy,
          suppression: metric.embeddedPolicy.suppression,
          applicableSources: [metric.query.source],
          priority: 200, // High priority for embedded policies
          auditLevel: 'summary',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const context: ExecutionContext = {
        executionId: requestId,
        tenantId: req.user!.tenantId,
        userId: req.user!.id,
        roles: req.user!.roles,
        policies,
        timestamp: new Date(),
        metadata: { metricId },
      };

      // Execute metric query
      const result = await queryExecutor.execute(metric.query, context);

      const response = {
        metric: {
          id: metric.id,
          name: metric.name,
          description: metric.description,
          category: metric.category,
        },
        result,
        cached: false,
      };

      // Cache result
      if (metric.cacheable && (result.status === 'success' || result.status === 'partial')) {
        await db.cacheSet(
          `metric:${metricId}:${req.user!.tenantId}`,
          response,
          metric.cacheTtl || 300
        );
      }

      res.json(response);
    } catch (error) {
      logger.error({ requestId, metricId, error }, 'Metric execution failed');
      res.status(500).json({
        error: 'Metric execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      });
    }
  }
);

/**
 * GET /api/v1/budget
 * Get privacy budget status for current tenant/user
 */
app.get(
  '/api/v1/budget',
  authorize(['user', 'analyst', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const budgetState = queryExecutor.getBudgetState(
        req.user!.tenantId,
        req.user!.id
      );

      res.json({
        tenantId: budgetState.tenantId,
        userId: budgetState.userId,
        budget: {
          total: budgetState.totalBudget,
          spent: budgetState.spentBudget,
          remaining: budgetState.totalBudget - budgetState.spentBudget,
          utilizationPercent: ((budgetState.spentBudget / budgetState.totalBudget) * 100).toFixed(2),
        },
        queries: {
          count: budgetState.queryCount,
        },
        period: {
          start: budgetState.periodStart,
          end: budgetState.periodEnd,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get budget status');
      res.status(500).json({ error: 'Failed to get budget status' });
    }
  }
);

/**
 * GET /api/v1/audit
 * Get privacy audit log (admin only)
 */
app.get(
  '/api/v1/audit',
  authorize(['admin', 'security']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
      const tenantFilter = req.query.tenantId as string;

      // Non-admins can only see their own tenant's audit log
      const effectiveTenantId = req.user!.roles.includes('admin')
        ? tenantFilter
        : req.user!.tenantId;

      const auditLog = queryExecutor.getAuditLog(effectiveTenantId, limit);

      res.json({
        records: auditLog,
        total: auditLog.length,
        limit,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get audit log');
      res.status(500).json({ error: 'Failed to get audit log' });
    }
  }
);

/**
 * GET /api/v1/admin/budgets
 * Get all privacy budget states (admin only)
 */
app.get(
  '/api/v1/admin/budgets',
  authorize(['admin']),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const budgetStates = queryExecutor.getAllBudgetStates();

      res.json({
        budgets: budgetStates.map(b => ({
          tenantId: b.tenantId,
          userId: b.userId,
          total: b.totalBudget,
          spent: b.spentBudget,
          remaining: b.totalBudget - b.spentBudget,
          queryCount: b.queryCount,
          periodStart: b.periodStart,
          periodEnd: b.periodEnd,
        })),
        total: budgetStates.length,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get budget states');
      res.status(500).json({ error: 'Failed to get budget states' });
    }
  }
);

// ============================================================================
// Error Handling
// ============================================================================

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ error }, 'Unhandled error');
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
});

app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl,
  });
});

// ============================================================================
// Server Lifecycle
// ============================================================================

async function startServer(): Promise<void> {
  try {
    logger.info('Starting Privacy Analytics Service...');

    // Connect to databases
    await db.connect();

    // Initialize services
    queryExecutor = new QueryExecutor(
      {
        postgres: db.postgres,
        neo4j: db.neo4j,
      },
      {
        enableDP: config.privacy.enableDifferentialPrivacy,
        enableKAnonymity: config.privacy.enableKAnonymity,
        defaultMinCohortSize: config.privacy.defaultMinCohortSize,
        defaultEpsilon: config.privacy.defaultEpsilon,
      }
    );

    governanceClient = new GovernanceClient(
      config.governance.serviceUrl,
      config.governance.opaEndpoint
    );

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`Privacy Analytics Service running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API docs: http://localhost:${PORT}/api/v1`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutdown signal received');

      server.close(async () => {
        logger.info('HTTP server closed');
        await db.disconnect();
        logger.info('Service shutdown complete');
        process.exit(0);
      });

      // Force exit after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Start if main module
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  startServer();
}

export { app, startServer };
