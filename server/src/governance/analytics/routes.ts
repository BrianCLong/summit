// API Routes for AI Governance Metrics
// RESTful endpoints for governance dashboard data

import { Router, Request, Response, NextFunction } from 'express';
import { governanceMetricsService } from './governance-metrics-service.js';
import { TimeRange, ComplianceGap, AuditEvent } from './types.js';
import {
  governanceDashboardLatency,
  governanceValidationRateGauge,
} from './governance-metrics-service.js';

const router = Router();

// Middleware to track request latency
const trackLatency = (endpoint: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const end = governanceDashboardLatency.startTimer({ endpoint });
    res.on('finish', () => {
      end({ status: res.statusCode < 400 ? 'success' : 'error' });
    });
    next();
  };
};

// Error handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * GET /api/governance/metrics
 * Get all governance metrics for the dashboard
 */
router.get(
  '/metrics',
  trackLatency('getMetrics'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const timeRangeParam = req.query.timeRange as string || '24h';

    const timeRanges: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const duration = timeRanges[timeRangeParam] || timeRanges['24h'];
    const timeRange: TimeRange = {
      start: Date.now() - duration,
      end: Date.now(),
      label: timeRangeParam,
    };

    const metrics = await governanceMetricsService.getGovernanceMetrics(
      tenantId,
      timeRange
    );

    res.json({
      success: true,
      data: metrics,
      meta: {
        tenantId,
        timeRange,
        generatedAt: Date.now(),
      },
    });
  })
);

/**
 * GET /api/governance/validation
 * Get ODNI validation metrics
 */
router.get(
  '/validation',
  trackLatency('getValidation'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const timeRangeParam = req.query.timeRange as string || '24h';

    const timeRanges: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const duration = timeRanges[timeRangeParam] || timeRanges['24h'];
    const timeRange: TimeRange = {
      start: Date.now() - duration,
      end: Date.now(),
      label: timeRangeParam,
    };

    const validationMetrics = await governanceMetricsService.getValidationMetrics(
      tenantId,
      timeRange
    );

    // Add ODNI compliance status
    const odniCompliant = validationMetrics.validationRate >= 85;

    res.json({
      success: true,
      data: {
        ...validationMetrics,
        odniCompliant,
        odniTarget: 85,
        complianceGap: odniCompliant ? 0 : 85 - validationMetrics.validationRate,
      },
      meta: {
        tenantId,
        timeRange,
        generatedAt: Date.now(),
      },
    });
  })
);

/**
 * GET /api/governance/incidents
 * Get incident trend data
 */
router.get(
  '/incidents',
  trackLatency('getIncidents'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const timeRangeParam = req.query.timeRange as string || '24h';

    const timeRanges: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const duration = timeRanges[timeRangeParam] || timeRanges['24h'];
    const timeRange: TimeRange = {
      start: Date.now() - duration,
      end: Date.now(),
      label: timeRangeParam,
    };

    const incidentTrends = await governanceMetricsService.getIncidentTrends(
      tenantId,
      timeRange
    );

    res.json({
      success: true,
      data: incidentTrends,
      meta: {
        tenantId,
        timeRange,
        generatedAt: Date.now(),
      },
    });
  })
);

/**
 * GET /api/governance/compliance-gaps
 * Get compliance gaps
 */
router.get(
  '/compliance-gaps',
  trackLatency('getComplianceGaps'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const severity = req.query.severity as string;
    const framework = req.query.framework as string;
    const status = req.query.status as string;

    let gaps = await governanceMetricsService.getComplianceGaps(tenantId);

    // Apply filters
    if (severity) {
      gaps = gaps.filter((g) => g.severity === severity.toLowerCase());
    }
    if (framework) {
      gaps = gaps.filter((g) => g.framework.toLowerCase() === framework.toLowerCase());
    }
    if (status) {
      gaps = gaps.filter((g) => g.status === status.toLowerCase());
    }

    // Calculate summary
    const summary = {
      total: gaps.length,
      bySeverity: {
        critical: gaps.filter((g) => g.severity === 'critical').length,
        high: gaps.filter((g) => g.severity === 'high').length,
        medium: gaps.filter((g) => g.severity === 'medium').length,
        low: gaps.filter((g) => g.severity === 'low').length,
      },
      byStatus: {
        open: gaps.filter((g) => g.status === 'open').length,
        inProgress: gaps.filter((g) => g.status === 'in_progress').length,
        mitigated: gaps.filter((g) => g.status === 'mitigated').length,
        accepted: gaps.filter((g) => g.status === 'accepted').length,
      },
    };

    res.json({
      success: true,
      data: gaps,
      summary,
      meta: {
        tenantId,
        filters: { severity, framework, status },
        generatedAt: Date.now(),
      },
    });
  })
);

/**
 * POST /api/governance/compliance-gaps
 * Record a new compliance gap
 */
router.post(
  '/compliance-gaps',
  trackLatency('createComplianceGap'),
  asyncHandler(async (req: Request, res: Response) => {
    const gapData: Omit<ComplianceGap, 'id'> = {
      ...req.body,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const gapId = await governanceMetricsService.recordComplianceGap(gapData);

    res.status(201).json({
      success: true,
      data: {
        id: gapId,
        ...gapData,
      },
      meta: {
        generatedAt: Date.now(),
      },
    });
  })
);

/**
 * GET /api/governance/risk-score
 * Get risk score data
 */
router.get(
  '/risk-score',
  trackLatency('getRiskScore'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const riskScore = await governanceMetricsService.getRiskScore(tenantId);

    // Calculate risk level
    const riskLevel =
      riskScore.overall >= 80
        ? 'low'
        : riskScore.overall >= 60
          ? 'medium'
          : riskScore.overall >= 40
            ? 'high'
            : 'critical';

    res.json({
      success: true,
      data: {
        ...riskScore,
        riskLevel,
      },
      meta: {
        tenantId,
        generatedAt: Date.now(),
      },
    });
  })
);

/**
 * GET /api/governance/audit-trail
 * Get audit events
 */
router.get(
  '/audit-trail',
  trackLatency('getAuditTrail'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const eventType = req.query.eventType as string;

    let events = await governanceMetricsService.getRecentAuditEvents(
      tenantId,
      limit + offset
    );

    // Filter by event type if specified
    if (eventType) {
      events = events.filter((e) => e.eventType === eventType);
    }

    // Apply pagination
    const paginatedEvents = events.slice(offset, offset + limit);

    res.json({
      success: true,
      data: paginatedEvents,
      pagination: {
        total: events.length,
        limit,
        offset,
        hasMore: offset + limit < events.length,
      },
      meta: {
        tenantId,
        filters: { eventType },
        generatedAt: Date.now(),
      },
    });
  })
);

/**
 * POST /api/governance/audit-trail
 * Record an audit event
 */
router.post(
  '/audit-trail',
  trackLatency('createAuditEvent'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const eventData: Omit<AuditEvent, 'id' | 'timestamp'> = req.body;

    const eventId = await governanceMetricsService.recordAuditEvent(
      tenantId,
      eventData
    );

    res.status(201).json({
      success: true,
      data: {
        id: eventId,
        timestamp: Date.now(),
        ...eventData,
      },
      meta: {
        tenantId,
        generatedAt: Date.now(),
      },
    });
  })
);

/**
 * GET /api/governance/models
 * Get model governance metrics
 */
router.get(
  '/models',
  trackLatency('getModelGovernance'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const modelMetrics = await governanceMetricsService.getModelGovernanceMetrics(
      tenantId
    );

    res.json({
      success: true,
      data: modelMetrics,
      meta: {
        tenantId,
        generatedAt: Date.now(),
      },
    });
  })
);

/**
 * GET /api/governance/config
 * Get dashboard configuration
 */
router.get(
  '/config',
  trackLatency('getConfig'),
  asyncHandler(async (req: Request, res: Response) => {
    const config = governanceMetricsService.getDashboardConfig();

    res.json({
      success: true,
      data: config,
      meta: {
        generatedAt: Date.now(),
      },
    });
  })
);

/**
 * GET /api/governance/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'governance-metrics',
    timestamp: Date.now(),
  });
});

/**
 * GET /api/governance/export
 * Export governance data
 */
router.get(
  '/export',
  trackLatency('exportData'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const format = req.query.format as string || 'json';
    const timeRangeParam = req.query.timeRange as string || '24h';

    const timeRanges: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const duration = timeRanges[timeRangeParam] || timeRanges['24h'];
    const timeRange: TimeRange = {
      start: Date.now() - duration,
      end: Date.now(),
      label: timeRangeParam,
    };

    const metrics = await governanceMetricsService.getGovernanceMetrics(
      tenantId,
      timeRange
    );

    if (format === 'csv') {
      // Generate CSV export
      const csvRows = [
        ['Metric', 'Value', 'Target', 'Status'],
        ['Validation Rate', metrics.validationRate.validationRate.toString(), '85', metrics.validationRate.validationRate >= 85 ? 'Compliant' : 'Non-Compliant'],
        ['Risk Score', metrics.riskScore.overall.toString(), '70', metrics.riskScore.overall >= 70 ? 'Healthy' : 'At Risk'],
        ['Active Incidents', (metrics.incidentTrends.current.totalIncidents - metrics.incidentTrends.current.resolvedIncidents).toString(), '-', '-'],
        ['Compliance Gaps', metrics.complianceGaps.length.toString(), '0', metrics.complianceGaps.length === 0 ? 'Compliant' : 'Action Required'],
      ];

      const csvContent = csvRows.map(row => row.join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=governance-metrics-${timeRangeParam}.csv`);
      res.send(csvContent);
    } else {
      // JSON export
      res.setHeader('Content-Disposition', `attachment; filename=governance-metrics-${timeRangeParam}.json`);
      res.json({
        exportedAt: Date.now(),
        tenantId,
        timeRange,
        metrics,
      });
    }
  })
);

// Error handling middleware
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Governance API Error:', err);
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
  });
});

export const governanceRoutes = router;
export default router;
