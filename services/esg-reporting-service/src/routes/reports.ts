/**
 * ESG Report Routes
 * REST API endpoints for ESG report management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { esgReportService } from '../services/ESGReportService.js';
import { metricsService } from '../services/MetricsService.js';
import { exportService } from '../services/ExportService.js';
import { createChildLogger } from '../utils/logger.js';
import {
  validateCreateReportInput,
  validateUpdateReportInput,
  validateMetricInput,
  ReportStatusSchema,
  ReportTypeSchema,
  ExportFormatSchema,
} from '@intelgraph/esg-reporting';

const router = Router();
const log = createChildLogger({ route: 'reports' });

// Middleware to extract tenant from headers or query
const extractTenant = (req: Request, res: Response, next: NextFunction) => {
  const tenantId = req.headers['x-tenant-id'] || req.query.tenantId;
  if (!tenantId || typeof tenantId !== 'string') {
    return res.status(400).json({ error: 'Tenant ID is required' });
  }
  req.tenantId = tenantId;
  next();
};

// Middleware to extract user from headers
const extractUser = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.headers['x-user-id'] || 'anonymous';
  req.userId = typeof userId === 'string' ? userId : 'anonymous';
  next();
};

// Apply middleware to all routes
router.use(extractTenant);
router.use(extractUser);

// ============================================================================
// Report CRUD Operations
// ============================================================================

/**
 * Create a new ESG report
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const input = validateCreateReportInput({
      ...req.body,
      tenantId: req.tenantId,
    });

    const report = await esgReportService.createReport(input, req.userId);
    res.status(201).json(report);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    log.error({ error }, 'Failed to create report');
    res.status(500).json({ error: 'Failed to create report' });
  }
});

/**
 * Get a report by ID
 */
router.get('/:reportId', async (req: Request, res: Response) => {
  try {
    const report = await esgReportService.getReport(req.params.reportId, req.tenantId);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Include metrics
    const metrics = await metricsService.getMetricsForReport(
      req.params.reportId,
      req.tenantId,
    );

    res.json({ ...report, metrics });
  } catch (error) {
    log.error({ error, reportId: req.params.reportId }, 'Failed to get report');
    res.status(500).json({ error: 'Failed to get report' });
  }
});

/**
 * List reports with filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string, 10) || 20, 100);

    const filter: Record<string, unknown> = {};

    if (req.query.status) {
      const statuses = (req.query.status as string).split(',');
      filter.status = statuses.map((s) => ReportStatusSchema.parse(s));
    }

    if (req.query.reportType) {
      const types = (req.query.reportType as string).split(',');
      filter.reportType = types.map((t) => ReportTypeSchema.parse(t));
    }

    if (req.query.periodStart) {
      filter.periodStart = new Date(req.query.periodStart as string);
    }

    if (req.query.periodEnd) {
      filter.periodEnd = new Date(req.query.periodEnd as string);
    }

    if (req.query.frameworks) {
      filter.frameworks = (req.query.frameworks as string).split(',');
    }

    const result = await esgReportService.listReports(
      req.tenantId,
      filter,
      page,
      pageSize,
    );

    res.json(result);
  } catch (error) {
    log.error({ error }, 'Failed to list reports');
    res.status(500).json({ error: 'Failed to list reports' });
  }
});

/**
 * Update a report
 */
router.patch('/:reportId', async (req: Request, res: Response) => {
  try {
    const input = validateUpdateReportInput(req.body);

    const report = await esgReportService.updateReport(
      req.params.reportId,
      req.tenantId,
      input,
      req.userId,
    );

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    log.error({ error, reportId: req.params.reportId }, 'Failed to update report');
    res.status(500).json({ error: 'Failed to update report' });
  }
});

/**
 * Delete a report
 */
router.delete('/:reportId', async (req: Request, res: Response) => {
  try {
    const deleted = await esgReportService.deleteReport(
      req.params.reportId,
      req.tenantId,
      req.userId,
    );

    if (!deleted) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.status(204).send();
  } catch (error) {
    log.error({ error, reportId: req.params.reportId }, 'Failed to delete report');
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// ============================================================================
// Report Scores
// ============================================================================

/**
 * Calculate and update ESG scores for a report
 */
router.post('/:reportId/calculate-scores', async (req: Request, res: Response) => {
  try {
    const scores = await esgReportService.calculateScores(
      req.params.reportId,
      req.tenantId,
    );

    if (!scores) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(scores);
  } catch (error) {
    log.error({ error, reportId: req.params.reportId }, 'Failed to calculate scores');
    res.status(500).json({ error: 'Failed to calculate scores' });
  }
});

// ============================================================================
// Metrics Operations
// ============================================================================

/**
 * Add a metric to a report
 */
router.post('/:reportId/metrics', async (req: Request, res: Response) => {
  try {
    const input = validateMetricInput(req.body);

    const metric = await metricsService.addMetric(
      req.tenantId,
      req.params.reportId,
      input,
      req.userId,
    );

    res.status(201).json(metric);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    log.error({ error, reportId: req.params.reportId }, 'Failed to add metric');
    res.status(500).json({ error: 'Failed to add metric' });
  }
});

/**
 * Get metrics for a report
 */
router.get('/:reportId/metrics', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const metrics = await metricsService.getMetricsForReport(
      req.params.reportId,
      req.tenantId,
      category as 'environmental' | 'social' | 'governance' | undefined,
    );

    res.json(metrics);
  } catch (error) {
    log.error({ error, reportId: req.params.reportId }, 'Failed to get metrics');
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

/**
 * Bulk import metrics
 */
router.post('/:reportId/metrics/bulk', async (req: Request, res: Response) => {
  try {
    const metrics = req.body.metrics;
    if (!Array.isArray(metrics)) {
      return res.status(400).json({ error: 'metrics must be an array' });
    }

    const result = await metricsService.bulkImportMetrics(
      req.tenantId,
      req.params.reportId,
      metrics.map(validateMetricInput),
      req.userId,
    );

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    log.error({ error, reportId: req.params.reportId }, 'Failed to bulk import metrics');
    res.status(500).json({ error: 'Failed to bulk import metrics' });
  }
});

// ============================================================================
// Compliance Assessment
// ============================================================================

/**
 * Assess compliance against a framework
 */
router.get('/:reportId/compliance/:frameworkId', async (req: Request, res: Response) => {
  try {
    const assessment = await metricsService.assessFrameworkCompliance(
      req.tenantId,
      req.params.reportId,
      req.params.frameworkId,
    );

    res.json(assessment);
  } catch (error) {
    log.error(
      { error, reportId: req.params.reportId, frameworkId: req.params.frameworkId },
      'Failed to assess compliance',
    );
    res.status(500).json({ error: 'Failed to assess compliance' });
  }
});

// ============================================================================
// Export Operations
// ============================================================================

/**
 * Export a report in specified formats
 */
router.post('/:reportId/export', async (req: Request, res: Response) => {
  try {
    const formats = req.body.formats || ['pdf'];

    // Validate formats
    const validFormats = formats.map((f: string) => ExportFormatSchema.parse(f));

    const report = await esgReportService.getReport(req.params.reportId, req.tenantId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const metrics = await metricsService.getMetricsForReport(
      req.params.reportId,
      req.tenantId,
    );

    const exports = await exportService.exportReport(report, metrics, {
      formats: validFormats,
      includeCharts: req.body.includeCharts !== false,
      includeRawData: req.body.includeRawData !== false,
      includeComplianceDetails: req.body.includeComplianceDetails !== false,
      watermark: req.body.watermark,
    });

    // If multiple formats, return archive
    if (exports.length > 1 || req.body.archive) {
      const archive = await exportService.exportToArchive(report, metrics, {
        formats: validFormats,
      });

      res.setHeader('Content-Type', archive.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${archive.filename}"`);
      return res.send(archive.data);
    }

    // Single format
    const exp = exports[0];
    res.setHeader('Content-Type', exp.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exp.filename}"`);
    res.send(exp.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid export format', details: error.errors });
    }
    log.error({ error, reportId: req.params.reportId }, 'Failed to export report');
    res.status(500).json({ error: 'Failed to export report' });
  }
});

export default router;

// Type augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      tenantId: string;
      userId: string;
    }
  }
}
