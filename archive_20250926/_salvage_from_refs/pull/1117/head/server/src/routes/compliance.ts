/**
 * Compliance Management API Routes
 * 
 * REST endpoints for managing compliance frameworks, assessments, and reporting.
 */

import { Router, Request, Response } from 'express';
import { complianceService } from '../services/ComplianceService.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/withAuthAndPolicy.js';
import { logger } from '../config/logger.js';
import { AppError } from '../lib/errors.js';
import { param, query, body, validationResult } from 'express-validator';

const router = Router();

// Apply authentication to all compliance routes
router.use(authMiddleware);

/**
 * GET /api/compliance/dashboard
 * Get compliance dashboard overview
 */
router.get('/dashboard',
  rbacMiddleware(['admin', 'compliance_officer', 'security_officer']),
  async (req: Request, res: Response) => {
    try {
      const dashboardData = await complianceService.getDashboardData();
      
      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      logger.error('Failed to get compliance dashboard data', {
        component: 'ComplianceRoutes',
        error: error.message,
        userId: req.user?.id
      });
      throw new AppError('Failed to retrieve compliance dashboard', 500);
    }
  }
);

/**
 * GET /api/compliance/frameworks
 * List all compliance frameworks
 */
router.get('/frameworks',
  rbacMiddleware(['admin', 'compliance_officer', 'security_officer', 'analyst']),
  async (req: Request, res: Response) => {
    try {
      const frameworks = complianceService.listFrameworks();
      
      res.json({
        success: true,
        data: frameworks,
        meta: {
          total: frameworks.length,
          enabled: frameworks.filter(f => f.enabled).length,
          compliant: frameworks.filter(f => f.status === 'compliant').length
        }
      });
    } catch (error) {
      logger.error('Failed to list compliance frameworks', {
        component: 'ComplianceRoutes',
        error: error.message,
        userId: req.user?.id
      });
      throw new AppError('Failed to retrieve compliance frameworks', 500);
    }
  }
);

/**
 * GET /api/compliance/frameworks/:id
 * Get a specific compliance framework
 */
router.get('/frameworks/:id',
  rbacMiddleware(['admin', 'compliance_officer', 'security_officer', 'analyst']),
  param('id').isString().notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid framework ID', 400, 'VALIDATION_ERROR');
      }

      const framework = complianceService.getFramework(req.params.id);
      if (!framework) {
        throw new AppError('Compliance framework not found', 404);
      }

      res.json({
        success: true,
        data: framework
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Failed to get compliance framework', {
        component: 'ComplianceRoutes',
        error: error.message,
        frameworkId: req.params.id,
        userId: req.user?.id
      });
      throw new AppError('Failed to retrieve compliance framework', 500);
    }
  }
);

/**
 * PUT /api/compliance/frameworks/:id
 * Update a compliance framework configuration
 */
router.put('/frameworks/:id',
  rbacMiddleware(['admin', 'compliance_officer']),
  param('id').isString().notEmpty(),
  body('enabled').isBoolean().optional(),
  body('assessmentFrequency').isIn(['daily', 'weekly', 'monthly', 'quarterly', 'annually']).optional(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', {
          errors: errors.array()
        });
      }

      const frameworkId = req.params.id;
      const updates = req.body;

      if (!complianceService.getFramework(frameworkId)) {
        throw new AppError('Compliance framework not found', 404);
      }

      const success = complianceService.updateFramework(frameworkId, updates);
      if (!success) {
        throw new AppError('Failed to update compliance framework', 500);
      }

      logger.info('Compliance framework updated', {
        component: 'ComplianceRoutes',
        frameworkId,
        updatedBy: req.user?.id,
        tenantId: req.user?.tenantId,
        changes: Object.keys(updates)
      });

      res.json({
        success: true,
        message: 'Compliance framework updated successfully'
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Failed to update compliance framework', {
        component: 'ComplianceRoutes',
        error: error.message,
        frameworkId: req.params.id,
        userId: req.user?.id
      });
      throw new AppError('Failed to update compliance framework', 500);
    }
  }
);

/**
 * POST /api/compliance/frameworks/:id/assess
 * Run compliance assessment for a framework
 */
router.post('/frameworks/:id/assess',
  rbacMiddleware(['admin', 'compliance_officer']),
  param('id').isString().notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid framework ID', 400, 'VALIDATION_ERROR');
      }

      const frameworkId = req.params.id;
      
      if (!complianceService.getFramework(frameworkId)) {
        throw new AppError('Compliance framework not found', 404);
      }

      logger.info('Starting compliance assessment', {
        component: 'ComplianceRoutes',
        frameworkId,
        initiatedBy: req.user?.id,
        tenantId: req.user?.tenantId
      });

      // Run assessment asynchronously
      const assessmentPromise = complianceService.runAssessment(frameworkId);
      
      // For long-running assessments, return immediately with job ID
      // In a real implementation, this would use a job queue
      const jobId = `assessment-${frameworkId}-${Date.now()}`;
      
      // Run assessment and handle result
      assessmentPromise
        .then(report => {
          logger.info('Compliance assessment completed', {
            component: 'ComplianceRoutes',
            frameworkId,
            reportId: report.id,
            overallScore: report.overallScore,
            status: report.status
          });
        })
        .catch(error => {
          logger.error('Compliance assessment failed', {
            component: 'ComplianceRoutes',
            frameworkId,
            error: error.message
          });
        });

      res.json({
        success: true,
        message: 'Compliance assessment started',
        data: {
          jobId,
          frameworkId,
          status: 'running'
        }
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Failed to start compliance assessment', {
        component: 'ComplianceRoutes',
        error: error.message,
        frameworkId: req.params.id,
        userId: req.user?.id
      });
      throw new AppError('Failed to start compliance assessment', 500);
    }
  }
);

/**
 * GET /api/compliance/reports/:id
 * Get a compliance report
 */
router.get('/reports/:id',
  rbacMiddleware(['admin', 'compliance_officer', 'security_officer', 'analyst']),
  param('id').isString().notEmpty(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid report ID', 400, 'VALIDATION_ERROR');
      }

      const report = await complianceService.getReport(req.params.id);
      if (!report) {
        throw new AppError('Compliance report not found', 404);
      }

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Failed to get compliance report', {
        component: 'ComplianceRoutes',
        error: error.message,
        reportId: req.params.id,
        userId: req.user?.id
      });
      throw new AppError('Failed to retrieve compliance report', 500);
    }
  }
);

/**
 * GET /api/compliance/status
 * Get overall compliance status
 */
router.get('/status',
  rbacMiddleware(['admin', 'compliance_officer', 'security_officer', 'analyst']),
  async (req: Request, res: Response) => {
    try {
      const frameworks = complianceService.listFrameworks();
      const enabledFrameworks = frameworks.filter(f => f.enabled);
      
      const overallStatus = {
        totalFrameworks: frameworks.length,
        enabledFrameworks: enabledFrameworks.length,
        compliantFrameworks: enabledFrameworks.filter(f => f.status === 'compliant').length,
        nonCompliantFrameworks: enabledFrameworks.filter(f => f.status === 'non-compliant').length,
        pendingFrameworks: enabledFrameworks.filter(f => f.status === 'pending').length,
        averageScore: enabledFrameworks.length > 0 ? 
          Math.round(enabledFrameworks.reduce((sum, f) => sum + f.score, 0) / enabledFrameworks.length) : 0,
        lastAssessment: enabledFrameworks
          .filter(f => f.lastAssessment)
          .sort((a, b) => (b.lastAssessment?.getTime() || 0) - (a.lastAssessment?.getTime() || 0))[0]?.lastAssessment,
        nextAssessment: enabledFrameworks
          .sort((a, b) => a.nextAssessment.getTime() - b.nextAssessment.getTime())[0]?.nextAssessment
      };

      res.json({
        success: true,
        data: overallStatus
      });
    } catch (error) {
      logger.error('Failed to get compliance status', {
        component: 'ComplianceRoutes',
        error: error.message,
        userId: req.user?.id
      });
      throw new AppError('Failed to retrieve compliance status', 500);
    }
  }
);

/**
 * GET /api/compliance/metrics
 * Get compliance metrics and trends
 */
router.get('/metrics',
  rbacMiddleware(['admin', 'compliance_officer', 'security_officer']),
  query('timeRange').isIn(['7d', '30d', '90d', '1y']).optional(),
  query('framework').isString().optional(),
  async (req: Request, res: Response) => {
    try {
      const timeRange = req.query.timeRange as string || '30d';
      const frameworkFilter = req.query.framework as string;
      
      const frameworks = complianceService.listFrameworks();
      const filteredFrameworks = frameworkFilter ? 
        frameworks.filter(f => f.id === frameworkFilter) : frameworks;

      // In a real implementation, this would query historical data from a database
      const mockMetrics = {
        timeRange,
        frameworks: filteredFrameworks.map(f => ({
          id: f.id,
          name: f.name,
          currentScore: f.score,
          trend: Math.random() > 0.5 ? 'improving' : 'declining',
          assessmentCount: Math.floor(Math.random() * 10) + 1,
          findingsCount: Math.floor(Math.random() * 20),
          criticalFindings: Math.floor(Math.random() * 5)
        })),
        overallTrends: {
          scoreHistory: Array.from({ length: 30 }, () => Math.floor(Math.random() * 40) + 60),
          findingsByCategory: {
            'technical': Math.floor(Math.random() * 20) + 10,
            'administrative': Math.floor(Math.random() * 15) + 5,
            'physical': Math.floor(Math.random() * 10) + 2
          },
          assessmentFrequency: {
            'weekly': 2,
            'monthly': 15,
            'quarterly': 8,
            'annually': 3
          }
        },
        upcomingAssessments: filteredFrameworks
          .filter(f => f.nextAssessment > new Date())
          .sort((a, b) => a.nextAssessment.getTime() - b.nextAssessment.getTime())
          .slice(0, 10)
          .map(f => ({
            frameworkId: f.id,
            frameworkName: f.name,
            scheduledDate: f.nextAssessment,
            daysUntil: Math.ceil((f.nextAssessment.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          }))
      };

      res.json({
        success: true,
        data: mockMetrics
      });
    } catch (error) {
      logger.error('Failed to get compliance metrics', {
        component: 'ComplianceRoutes',
        error: error.message,
        userId: req.user?.id
      });
      throw new AppError('Failed to retrieve compliance metrics', 500);
    }
  }
);

/**
 * POST /api/compliance/export
 * Export compliance report
 */
router.post('/export',
  rbacMiddleware(['admin', 'compliance_officer']),
  body('frameworkId').isString().notEmpty(),
  body('format').isIn(['pdf', 'xlsx', 'json']).optional(),
  body('includeEvidence').isBoolean().optional(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', {
          errors: errors.array()
        });
      }

      const { frameworkId, format = 'pdf', includeEvidence = false } = req.body;
      
      const framework = complianceService.getFramework(frameworkId);
      if (!framework) {
        throw new AppError('Compliance framework not found', 404);
      }

      // In a real implementation, this would generate and return the actual report file
      const exportData = {
        frameworkId,
        frameworkName: framework.name,
        format,
        includeEvidence,
        generatedAt: new Date(),
        downloadUrl: `/api/compliance/downloads/${frameworkId}-${Date.now()}.${format}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };

      logger.info('Compliance report export requested', {
        component: 'ComplianceRoutes',
        frameworkId,
        format,
        includeEvidence,
        requestedBy: req.user?.id,
        tenantId: req.user?.tenantId
      });

      res.json({
        success: true,
        message: 'Report export initiated',
        data: exportData
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Failed to export compliance report', {
        component: 'ComplianceRoutes',
        error: error.message,
        userId: req.user?.id
      });
      throw new AppError('Failed to export compliance report', 500);
    }
  }
);

/**
 * GET /api/compliance/health
 * Get compliance service health
 */
router.get('/health',
  async (req: Request, res: Response) => {
    try {
      const frameworks = complianceService.listFrameworks();
      const enabledCount = frameworks.filter(f => f.enabled).length;
      
      const health = {
        status: 'healthy',
        timestamp: new Date(),
        frameworks: {
          total: frameworks.length,
          enabled: enabledCount,
          disabled: frameworks.length - enabledCount
        },
        lastActivity: frameworks
          .filter(f => f.lastAssessment)
          .sort((a, b) => (b.lastAssessment?.getTime() || 0) - (a.lastAssessment?.getTime() || 0))[0]?.lastAssessment
      };

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      logger.error('Compliance health check failed', {
        component: 'ComplianceRoutes',
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        error: 'Compliance service health check failed'
      });
    }
  }
);

export default router;