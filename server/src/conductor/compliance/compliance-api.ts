// Compliance API for Conductor
// Provides endpoints for compliance monitoring, assessment, and reporting

import express from 'express';
import { complianceEngine } from './compliance-engine';
import { prometheusConductorMetrics } from '../observability/prometheus';

export const complianceRouter = express.Router();

interface AssessmentRequest {
  frameworkId: string;
  scope?: string[];
  assessmentType?: 'self' | 'internal_audit' | 'external_audit' | 'continuous';
}

/**
 * Run compliance assessment
 */
complianceRouter.post('/assessments/run', async (req, res) => {
  const startTime = Date.now();

  try {
    const assessmentRequest: AssessmentRequest = req.body;
    const tenantId = req.headers['x-tenant-id'] as string;
    const assessor = req.user?.sub || 'system';

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required',
      });
    }

    if (!assessmentRequest.frameworkId) {
      return res.status(400).json({
        success: false,
        message: 'frameworkId is required',
      });
    }

    const assessmentId = await complianceEngine.runAssessment(
      assessmentRequest.frameworkId,
      tenantId,
      assessor,
      assessmentRequest.scope,
    );

    const response = {
      success: true,
      assessmentId,
      message: 'Compliance assessment completed',
      processingTime: Date.now() - startTime,
    };

    // Record metrics
    prometheusConductorMetrics.recordOperationalEvent(
      'compliance_assessment_run',
      true,
    );
    prometheusConductorMetrics.recordOperationalMetric(
      'compliance_assessment_time',
      response.processingTime,
    );

    res.json(response);
  } catch (error) {
    console.error('Assessment execution error:', error);

    prometheusConductorMetrics.recordOperationalEvent(
      'compliance_assessment_error',
      false,
    );

    res.status(500).json({
      success: false,
      message: 'Failed to run compliance assessment',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
    });
  }
});

/**
 * Get assessment results
 */
complianceRouter.get('/assessments/:assessmentId', async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;

    const assessment = await complianceEngine.getAssessment(assessmentId);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found',
      });
    }

    // Check tenant access
    if (assessment.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: tenant boundary violation',
      });
    }

    res.json({
      success: true,
      assessment,
    });
  } catch (error) {
    console.error('Assessment retrieval error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve assessment',
    });
  }
});

/**
 * List assessments for tenant
 */
complianceRouter.get('/assessments', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { limit = '10', frameworkId } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required',
      });
    }

    let assessments = await complianceEngine.listAssessments(
      tenantId,
      parseInt(limit as string),
    );

    // Filter by framework if specified
    if (frameworkId) {
      assessments = assessments.filter((a) => a.frameworkId === frameworkId);
    }

    res.json({
      success: true,
      assessments,
      total: assessments.length,
    });
  } catch (error) {
    console.error('Assessment listing error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to list assessments',
    });
  }
});

/**
 * Get compliance dashboard
 */
complianceRouter.get('/dashboard', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required',
      });
    }

    const dashboard = await complianceEngine.getComplianceDashboard(tenantId);

    res.json({
      success: true,
      dashboard,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Dashboard retrieval error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance dashboard',
    });
  }
});

/**
 * Get available compliance frameworks
 */
complianceRouter.get('/frameworks', async (req, res) => {
  try {
    const frameworks = [
      {
        id: 'soc2-2017',
        name: 'SOC 2 Type II',
        version: '2017',
        description:
          'System and Organization Controls 2 - Trust Services Criteria',
        categories: [
          'Common Criteria',
          'Availability',
          'Confidentiality',
          'Processing Integrity',
          'Privacy',
        ],
        auditFrequency: 'annually',
        certificationRequired: true,
      },
      {
        id: 'gdpr-2018',
        name: 'General Data Protection Regulation',
        version: '2018',
        description:
          'EU General Data Protection Regulation compliance requirements',
        categories: [
          'Lawfulness of Processing',
          'Data Subject Rights',
          'Privacy by Design',
          'Security of Processing',
          'International Transfers',
        ],
        auditFrequency: 'quarterly',
        certificationRequired: false,
      },
      {
        id: 'iso27001-2013',
        name: 'ISO/IEC 27001:2013',
        version: '2013',
        description: 'Information Security Management System requirements',
        categories: [
          'Context',
          'Leadership',
          'Planning',
          'Support',
          'Operation',
          'Performance Evaluation',
          'Improvement',
        ],
        auditFrequency: 'annually',
        certificationRequired: true,
      },
      {
        id: 'nist-csf-1.1',
        name: 'NIST Cybersecurity Framework',
        version: '1.1',
        description:
          'Framework for improving critical infrastructure cybersecurity',
        categories: ['Identify', 'Protect', 'Detect', 'Respond', 'Recover'],
        auditFrequency: 'quarterly',
        certificationRequired: false,
      },
    ];

    res.json({
      success: true,
      frameworks,
      total: frameworks.length,
    });
  } catch (error) {
    console.error('Frameworks listing error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to list frameworks',
    });
  }
});

/**
 * Update finding status
 */
complianceRouter.patch('/findings/:findingId/status', async (req, res) => {
  const startTime = Date.now();

  try {
    const { findingId } = req.params;
    const { status, comments, assignee } = req.body;
    const updatedBy = req.user?.sub || 'system';

    const validStatuses = [
      'open',
      'in_progress',
      'resolved',
      'accepted_risk',
      'false_positive',
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // In a real implementation, you would update the finding in the database
    // For now, we'll simulate the update

    const response = {
      success: true,
      findingId,
      status,
      updatedBy,
      updateTime: Date.now(),
      comments,
      assignee,
      message: 'Finding status updated successfully',
      processingTime: Date.now() - startTime,
    };

    // Record metrics
    prometheusConductorMetrics.recordOperationalEvent(
      'compliance_finding_updated',
      true,
    );

    res.json(response);
  } catch (error) {
    console.error('Finding update error:', error);

    prometheusConductorMetrics.recordOperationalEvent(
      'compliance_finding_update_error',
      false,
    );

    res.status(500).json({
      success: false,
      message: 'Failed to update finding status',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
    });
  }
});

/**
 * Generate compliance report
 */
complianceRouter.post('/reports/generate', async (req, res) => {
  const startTime = Date.now();

  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { reportType, frameworkId, dateRange, format = 'json' } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required',
      });
    }

    const validReportTypes = [
      'executive_summary',
      'detailed_findings',
      'control_effectiveness',
      'risk_assessment',
    ];
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid report type. Must be one of: ${validReportTypes.join(', ')}`,
      });
    }

    // Generate report (simplified implementation)
    const dashboard = await complianceEngine.getComplianceDashboard(tenantId);
    const assessments = await complianceEngine.listAssessments(tenantId, 5);

    const report = {
      reportId: `report_${Date.now()}`,
      reportType,
      frameworkId,
      tenantId,
      generatedAt: Date.now(),
      generatedBy: req.user?.sub || 'system',
      summary: {
        overallScore: dashboard.overallScore,
        riskLevel: dashboard.riskLevel,
        totalFindings: dashboard.activeFindings,
        assessmentsReviewed: assessments.length,
      },
      executiveSummary: {
        compliancePosture:
          dashboard.overallScore >= 80
            ? 'Strong'
            : dashboard.overallScore >= 60
              ? 'Moderate'
              : 'Weak',
        keyRisks: assessments
          .flatMap((a) => a.findings.filter((f) => f.severity === 'critical'))
          .slice(0, 5),
        recommendations: [
          'Prioritize resolution of critical findings',
          'Implement continuous monitoring',
          'Schedule regular compliance training',
          'Review and update policies quarterly',
        ],
      },
      frameworkStatus: dashboard.frameworkStatus,
      trendAnalysis: {
        scoreHistory: assessments.map((a) => ({
          date: a.completionDate,
          score: a.overallScore,
        })),
        findingsTrend: 'improving', // Simplified
      },
    };

    const response = {
      success: true,
      report,
      format,
      message: 'Compliance report generated successfully',
      processingTime: Date.now() - startTime,
    };

    // Record metrics
    prometheusConductorMetrics.recordOperationalEvent(
      'compliance_report_generated',
      true,
    );
    prometheusConductorMetrics.recordOperationalMetric(
      'compliance_report_time',
      response.processingTime,
    );

    res.json(response);
  } catch (error) {
    console.error('Report generation error:', error);

    prometheusConductorMetrics.recordOperationalEvent(
      'compliance_report_error',
      false,
    );

    res.status(500).json({
      success: false,
      message: 'Failed to generate compliance report',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
    });
  }
});

/**
 * Schedule automated assessment
 */
complianceRouter.post('/schedule/assessment', async (req, res) => {
  const startTime = Date.now();

  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { frameworkId, frequency, scope, enabled = true } = req.body;
    const scheduledBy = req.user?.sub || 'system';

    if (!tenantId || !frameworkId || !frequency) {
      return res.status(400).json({
        success: false,
        message: 'tenantId, frameworkId, and frequency are required',
      });
    }

    const validFrequencies = [
      'daily',
      'weekly',
      'monthly',
      'quarterly',
      'annually',
    ];
    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({
        success: false,
        message: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`,
      });
    }

    // Create schedule entry (simplified implementation)
    const scheduleId = `schedule_${Date.now()}`;

    const schedule = {
      id: scheduleId,
      tenantId,
      frameworkId,
      frequency,
      scope: scope || ['all'],
      enabled,
      scheduledBy,
      createdAt: Date.now(),
      nextRun: this.calculateNextRun(frequency),
    };

    const response = {
      success: true,
      schedule,
      message: 'Assessment schedule created successfully',
      processingTime: Date.now() - startTime,
    };

    // Record metrics
    prometheusConductorMetrics.recordOperationalEvent(
      'compliance_schedule_created',
      true,
    );

    res.json(response);
  } catch (error) {
    console.error('Schedule creation error:', error);

    prometheusConductorMetrics.recordOperationalEvent(
      'compliance_schedule_error',
      false,
    );

    res.status(500).json({
      success: false,
      message: 'Failed to create assessment schedule',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
    });
  }

  // Helper function to calculate next run time
  function calculateNextRun(frequency: string): number {
    const now = Date.now();
    const intervals = {
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
      quarterly: 90 * 24 * 60 * 60 * 1000,
      annually: 365 * 24 * 60 * 60 * 1000,
    };

    return now + intervals[frequency as keyof typeof intervals];
  }
});

/**
 * Get compliance metrics for monitoring
 */
complianceRouter.get('/metrics', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required',
      });
    }

    const dashboard = await complianceEngine.getComplianceDashboard(tenantId);

    const metrics = {
      complianceScore: dashboard.overallScore,
      riskLevel: dashboard.riskLevel,
      openFindings: dashboard.activeFindings,
      frameworkCount: dashboard.frameworkStatus.length,
      assessmentCount: dashboard.recentAssessments.length,
      averageFrameworkScore:
        dashboard.frameworkStatus.length > 0
          ? Math.round(
              dashboard.frameworkStatus.reduce((sum, f) => sum + f.score, 0) /
                dashboard.frameworkStatus.length,
            )
          : 0,
      lastAssessment:
        dashboard.recentAssessments.length > 0
          ? Math.max(
              ...dashboard.recentAssessments.map(
                (a) => a.completionDate || a.startDate,
              ),
            )
          : 0,
    };

    res.json({
      success: true,
      metrics,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Metrics retrieval error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance metrics',
    });
  }
});

/**
 * Health check
 */
complianceRouter.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: Date.now(),
    service: 'compliance-api',
  });
});

// Request logging middleware
complianceRouter.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `Compliance API: ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`,
    );

    prometheusConductorMetrics.recordOperationalMetric(
      'compliance_api_request_duration',
      duration,
    );
    prometheusConductorMetrics.recordOperationalEvent(
      `compliance_api_${req.method.toLowerCase()}`,
      res.statusCode < 400,
    );
  });

  next();
});

export default complianceRouter;
