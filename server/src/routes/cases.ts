/**
 * Case Routes - REST API endpoints for Case Spaces
 * Implements CRUD operations with integrated audit logging
 */

import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { getPostgresPool } from '../db/postgres.js';
import { CaseService } from '../cases/CaseService.js';
import { CaseInput, CaseUpdateInput } from '../repos/CaseRepo.js';
import { LegalBasis } from '../repos/AuditAccessLogRepo.js';
import { CaseOverviewService } from '../cases/overview/CaseOverviewService.js';
import { CommentService } from '../cases/comments/CommentService.js';
import { ChainOfCustodyService } from '../cases/chain-of-custody.js';
import { ReportingService, createReportingService } from '../reporting/service.js';
import { AccessControlService } from '../reporting/access-control.js';
import { INVESTIGATION_SUMMARY_TEMPLATE } from '../cases/reporting/templates.js';
import { goldenPathStepTotal } from '../monitoring/metrics.js';
import logger from '../config/logger.js';
import { emitAuditEvent } from '../audit/emit.js';

const routeLogger = logger.child({ name: 'CaseRoutes' });
const overviewService = new CaseOverviewService(getPostgresPool(), {
  ttlMs: Number.isFinite(Number(process.env.CASE_OVERVIEW_CACHE_TTL_MS))
    ? Number(process.env.CASE_OVERVIEW_CACHE_TTL_MS)
    : undefined,
  staleWhileRevalidateMs: Number.isFinite(
    Number(process.env.CASE_OVERVIEW_CACHE_SWR_MS),
  )
    ? Number(process.env.CASE_OVERVIEW_CACHE_SWR_MS)
    : undefined,
});

export const caseRouter = Router();

/**
 * Helper to extract tenant and user from request
 */
function getRequestContext(req: any): {
  tenantId: string | null;
  userId: string | null;
} {
  const tenantId = String(
    req.headers['x-tenant-id'] || req.headers['x-tenant'] || '',
  );
  const userId =
    req.user?.id || req.headers['x-user-id'] || req.user?.email || 'system';

  return {
    tenantId: tenantId || null,
    userId: userId || null,
  };
}

/**
 * Helper to extract audit context from request body
 */
function getAuditContext(
  body: any,
): Pick<any, 'reason' | 'legalBasis'> & Partial<any> {
  return {
    reason: body.reason,
    legalBasis: body.legalBasis as LegalBasis,
    warrantId: body.warrantId,
    authorityReference: body.authorityReference,
    ipAddress: body._ipAddress,
    userAgent: body._userAgent,
    sessionId: body._sessionId,
    requestId: body._requestId,
    correlationId: body._correlationId,
  };
}

/**
 * GET /api/cases/:id/overview - Cached overview metrics served from materialized cache
 */
caseRouter.get('/:id/overview', async (req, res) => {
  try {
    const { tenantId, userId } = getRequestContext(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'user_required' });
    }

    const { id } = req.params;

    const reason = req.query.reason as string;
    const legalBasis = req.query.legalBasis as LegalBasis;

    if (!reason) {
      return res.status(400).json({
        error: 'reason_required',
        message: 'You must provide a reason for accessing this case overview',
      });
    }

    if (!legalBasis) {
      return res.status(400).json({
        error: 'legal_basis_required',
        message: 'You must provide a legal basis for accessing this case overview',
      });
    }

    const pg = getPostgresPool();
    const caseExists = await pg.query(
      `SELECT 1 FROM maestro.cases WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );

    if (caseExists.rowCount === 0) {
      return res.status(404).json({ error: 'case_not_found' });
    }

    const overview = await overviewService.getOverview(id, tenantId);

    routeLogger.info(
      {
        caseId: id,
        tenantId,
        userId,
        cacheStatus: overview.cache.status,
      },
      'Case overview retrieved',
    );

    res.json({
      ...overview,
      audit: {
        reason,
        legalBasis,
      },
    });
  } catch (error: any) {
    routeLogger.error({ error: (error as Error).message }, 'Failed to get case overview');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/cases - Create a new case
 */
caseRouter.post('/', async (req, res) => {
  try {
    const { tenantId, userId } = getRequestContext(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'user_required' });
    }

    const input: CaseInput = {
      tenantId,
      title: req.body.title,
      description: req.body.description,
      status: req.body.status,
      compartment: req.body.compartment,
      policyLabels: req.body.policyLabels,
      metadata: req.body.metadata,
    };

    const pg = getPostgresPool();
    const service = new CaseService(pg);

    const auditContext = getAuditContext(req.body);
    const caseRecord = await service.createCase(input, userId, auditContext);

    goldenPathStepTotal.inc({
      step: 'investigation_created',
      status: 'success',
      tenant_id: tenantId
    });

    routeLogger.info(
      { caseId: caseRecord.id, tenantId, userId },
      'Case created via API',
    );

    res.status(201).json(caseRecord);
  } catch (error: any) {
    routeLogger.error({ error: (error as Error).message }, 'Failed to create case');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/cases/:id - Get a case by ID
 */
caseRouter.get('/:id', async (req, res) => {
  try {
    const { tenantId, userId } = getRequestContext(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'user_required' });
    }

    const { id } = req.params;

    // Require reason and legal basis for viewing
    const reason = req.query.reason as string;
    const legalBasis = req.query.legalBasis as LegalBasis;

    if (!reason) {
      return res.status(400).json({
        error: 'reason_required',
        message: 'You must provide a reason for accessing this case',
      });
    }

    if (!legalBasis) {
      return res.status(400).json({
        error: 'legal_basis_required',
        message: 'You must provide a legal basis for accessing this case',
      });
    }

    const pg = getPostgresPool();
    const service = new CaseService(pg);

    const auditContext = {
      reason,
      legalBasis,
      warrantId: req.query.warrantId as string,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const caseRecord = await service.getCase(id, tenantId, userId, auditContext);

    if (!caseRecord) {
      return res.status(404).json({ error: 'case_not_found' });
    }

    res.json(caseRecord);
  } catch (error: any) {
    routeLogger.error({ error: (error as Error).message }, 'Failed to get case');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * PUT /api/cases/:id - Update a case
 */
caseRouter.put('/:id', async (req, res) => {
  try {
    const { tenantId, userId } = getRequestContext(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'user_required' });
    }

    const { id } = req.params;

    // Require reason and legal basis for modification
    if (!req.body.reason) {
      return res.status(400).json({
        error: 'reason_required',
        message: 'You must provide a reason for modifying this case',
      });
    }

    if (!req.body.legalBasis) {
      return res.status(400).json({
        error: 'legal_basis_required',
        message: 'You must provide a legal basis for modifying this case',
      });
    }

    const input: CaseUpdateInput = {
      id,
      title: req.body.title,
      description: req.body.description,
      status: req.body.status,
      compartment: req.body.compartment,
      policyLabels: req.body.policyLabels,
      metadata: req.body.metadata,
    };

    const pg = getPostgresPool();
    const service = new CaseService(pg);

    const auditContext = getAuditContext(req.body);
    auditContext.ipAddress = req.ip;
    auditContext.userAgent = req.headers['user-agent'];

    const caseRecord = await service.updateCase(
      input,
      userId,
      tenantId,
      auditContext,
    );

    if (!caseRecord) {
      return res.status(404).json({ error: 'case_not_found' });
    }

    res.json(caseRecord);
  } catch (error: any) {
    routeLogger.error({ error: (error as Error).message }, 'Failed to update case');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/cases - List cases
 */
caseRouter.get('/', async (req, res) => {
  try {
    const { tenantId } = getRequestContext(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    const pg = getPostgresPool();
    const service = new CaseService(pg);

    const cases = await service.listCases({
      tenantId,
      status: req.query.status as any,
      compartment: req.query.compartment as string,
      policyLabels: req.query.policyLabels
        ? (req.query.policyLabels as string).split(',')
        : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset
        ? parseInt(req.query.offset as string)
        : undefined,
    });

    res.json(cases);
  } catch (error: any) {
    routeLogger.error({ error: (error as Error).message }, 'Failed to list cases');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/cases/:id/archive - Archive a case
 */
caseRouter.post('/:id/archive', async (req, res) => {
  try {
    const { tenantId, userId } = getRequestContext(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'user_required' });
    }

    const { id } = req.params;

    // Require reason and legal basis for archiving
    if (!req.body.reason) {
      return res.status(400).json({
        error: 'reason_required',
        message: 'You must provide a reason for archiving this case',
      });
    }

    if (!req.body.legalBasis) {
      return res.status(400).json({
        error: 'legal_basis_required',
        message: 'You must provide a legal basis for archiving this case',
      });
    }

    const pg = getPostgresPool();
    const service = new CaseService(pg);

    const auditContext = getAuditContext(req.body);
    auditContext.ipAddress = req.ip;
    auditContext.userAgent = req.headers['user-agent'];

    const caseRecord = await service.archiveCase(
      id,
      userId,
      tenantId,
      auditContext,
    );

    if (!caseRecord) {
      return res.status(404).json({ error: 'case_not_found' });
    }

    res.json(caseRecord);
  } catch (error: any) {
    routeLogger.error({ error: (error as Error).message }, 'Failed to archive case');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/cases/:id/export - Export case data
 */
caseRouter.post('/:id/export', async (req, res) => {
  try {
    const { tenantId, userId } = getRequestContext(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'user_required' });
    }

    const { id } = req.params;

    // Require reason and legal basis for export
    if (!req.body.reason) {
      return res.status(400).json({
        error: 'reason_required',
        message: 'You must provide a reason for exporting this case',
      });
    }

    if (!req.body.legalBasis) {
      return res.status(400).json({
        error: 'legal_basis_required',
        message: 'You must provide a legal basis for exporting this case',
      });
    }

    const pg = getPostgresPool();
    const service = new CaseService(pg);

    const auditContext = getAuditContext(req.body);
    auditContext.ipAddress = req.ip;
    auditContext.userAgent = req.headers['user-agent'];

    const caseRecord = await service.exportCase(
      id,
      tenantId,
      userId,
      auditContext,
    );

    if (!caseRecord) {
      return res.status(404).json({ error: 'case_not_found' });
    }

    res.json(caseRecord);
  } catch (error: any) {
    // Handle specific user-facing errors
    if ((error as any).name === 'UserFacingError') {
      return res.status(400).json({ error: (error as Error).message });
    }
    routeLogger.error({ error: (error as Error).message }, 'Failed to export case');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/cases/:id/release-criteria - Configure release criteria
 */
caseRouter.post('/:id/release-criteria', async (req, res) => {
  try {
    const { tenantId, userId } = getRequestContext(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'user_required' });
    }

    const { id } = req.params;
    const config = req.body; // ReleaseCriteriaConfig

    const pg = getPostgresPool();
    // We need to instantiate the ReleaseCriteriaService.
    // Since CaseService initializes it privately, we should probably access it differently
    // or instantiate it directly here.
    // For now, let's instantiate it directly as we didn't expose it in CaseService.
    const { ReleaseCriteriaService } = await import('../cases/ReleaseCriteriaService.js');
    const service = new ReleaseCriteriaService(pg);

    await service.configure(id, tenantId, userId, config);

    res.status(200).json({ message: 'Release criteria configured' });
  } catch (error: any) {
    routeLogger.error({ error: (error as Error).message }, 'Failed to configure release criteria');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/cases/:id/release-criteria/status - Get release criteria status
 */
caseRouter.get('/:id/release-criteria/status', async (req, res) => {
  try {
    const { tenantId } = getRequestContext(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    const { id } = req.params;

    const pg = getPostgresPool();
    const { ReleaseCriteriaService } = await import('../cases/ReleaseCriteriaService.js');
    const service = new ReleaseCriteriaService(pg);

    const result = await service.evaluate(id, tenantId);

    res.json(result);
  } catch (error: any) {
    routeLogger.error({ error: (error as Error).message }, 'Failed to get release criteria status');
    res.status(500).json({ error: (error as Error).message });
  }
});

// ==================== COMMENTS ====================

/**
 * POST /api/cases/:id/comments - Add a comment
 */
caseRouter.post('/:id/comments', async (req, res) => {
  try {
    const { tenantId, userId } = getRequestContext(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'user_required' });
    }

    const { id } = req.params;
    const { content, metadata } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content_required' });
    }

    const pg = getPostgresPool();
    const service = new CommentService(pg);

    const comment = await service.addComment({
      tenantId,
      targetType: 'CASE',
      targetId: id,
      content,
      authorId: userId,
      metadata,
    });

    await emitAuditEvent(
      {
        eventId: randomUUID(),
        occurredAt: new Date().toISOString(),
        actor: {
          type: 'user',
          id: userId,
          name: (req.user as any)?.username || (req.user as any)?.email || userId,
          ipAddress: req.ip,
        },
        action: {
          type: 'comment.added',
          outcome: 'success',
        },
        tenantId,
        target: {
          type: 'case_comment',
          id: comment.commentId,
          path: `cases/${id}`,
        },
        metadata: {
          caseId: id,
          commentId: comment.commentId,
          messageLength: String(content).length,
          userAgent: req.headers['user-agent'],
        },
      },
      {
        correlationId: req.headers['x-request-id'] as string,
        serviceId: 'cases',
      },
    ).catch((error) => {
      routeLogger.warn(
        { error: (error as Error).message, caseId: id },
        'Failed to emit comment audit event',
      );
    });

    res.status(201).json(comment);
  } catch (error: any) {
    // Handle specific user-facing errors
    if ((error as any).name === 'UserFacingError') {
      return res.status(404).json({ error: (error as Error).message });
    }
    routeLogger.error({ error: (error as Error).message }, 'Failed to add comment');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/cases/:id/comments - List comments
 */
caseRouter.get('/:id/comments', async (req, res) => {
  try {
    const { tenantId, userId } = getRequestContext(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    const { id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

    const pg = getPostgresPool();
    const service = new CommentService(pg);

    const comments = await service.listComments({
      targetType: 'CASE',
      targetId: id,
      tenantId,
      limit,
      offset,
    });

    res.json(comments);
  } catch (error: any) {
    if ((error as any).name === 'UserFacingError') {
      return res.status(404).json({ error: (error as Error).message });
    }
    routeLogger.error({ error: (error as Error).message }, 'Failed to list comments');
    res.status(500).json({ error: (error as Error).message });
  }
});

// ==================== CHAIN OF CUSTODY ====================

/**
 * POST /api/cases/:id/evidence/event - Record chain of custody event
 */
caseRouter.post('/:id/evidence/event', async (req, res) => {
  try {
    const { tenantId, userId } = getRequestContext(req);

    if (!userId) {
      return res.status(401).json({ error: 'user_required' });
    }

    const { id: caseId } = req.params;
    const { evidenceId, action, location, notes, verificationHash } = req.body;

    if (!evidenceId || !action) {
      return res.status(400).json({ error: 'evidenceId and action are required' });
    }

    const pg = getPostgresPool();
    const service = new ChainOfCustodyService(pg);

    const event = await service.recordEvent({
      caseId,
      evidenceId,
      action,
      actorId: userId,
      location,
      notes,
      verificationHash,
    });

    res.status(201).json(event);
  } catch (error: any) {
    routeLogger.error({ error: (error as Error).message }, 'Failed to record custody event');
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/cases/:id/evidence/:evidenceId/chain - Get chain of custody
 */
caseRouter.get('/:id/evidence/:evidenceId/chain', async (req, res) => {
  try {
    const { evidenceId } = req.params;

    const pg = getPostgresPool();
    const service = new ChainOfCustodyService(pg);

    const chain = await service.getChain(evidenceId);

    res.json(chain);
  } catch (error: any) {
    routeLogger.error({ error: (error as Error).message }, 'Failed to get chain of custody');
    res.status(500).json({ error: (error as Error).message });
  }
});

// ==================== REPORTING ====================

/**
 * POST /api/cases/:id/report - Generate case report
 */
caseRouter.post('/:id/report', async (req, res) => {
  try {
    const { tenantId, userId } = getRequestContext(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'user_required' });
    }

    const { id } = req.params;

    const pg = getPostgresPool();
    const caseService = new CaseService(pg);

    // Fetch case data to populate template
    // We pass minimal audit context since this is an internal fetch for reporting
    const caseData = await caseService.getCase(id, tenantId, userId, { reason: 'Report Generation', legalBasis: 'investigation' });

    if (!caseData) {
      return res.status(404).json({ error: 'case_not_found' });
    }

    // Fetch tasks
    const { TaskRepo } = await import('../cases/workflow/repos/TaskRepo.js');
    const taskRepo = new TaskRepo(pg);
    const tasks = await taskRepo.getCaseTasks(id);

    // Fetch evidence (Chain of Custody)
    const chainService = new ChainOfCustodyService(pg);
    const evidenceItems = await chainService.listEvidence(id);
    const evidence = evidenceItems.map(item => ({
      id: item.id,
      description: 'Evidence item', // Placeholder
      lastUpdate: item.lastUpdate
    }));

    const context = {
      case: caseData,
      tasks,
      evidence,
    };

    // Initialize reporting service
    const rules = [
      {
        resource: 'report',
        action: 'view',
        roles: ['investigator', 'admin', 'analyst']
      },
      {
        resource: 'report',
        action: 'deliver',
        roles: ['investigator', 'admin']
      }
    ];

    // Initialize with proper rules
    const accessControl = new AccessControlService(rules as any);
    const reportingService = createReportingService(accessControl);

    const userRoles = (req.user as any)?.roles || ['investigator'];

    const report = await reportingService.generate(
      {
        template: INVESTIGATION_SUMMARY_TEMPLATE,
        context,
        watermark: req.body.watermark,
      },
      {
        userId,
        roles: userRoles,
      },
    );

    res.json(report);
  } catch (error: any) {
    routeLogger.error({ error: (error as Error).message }, 'Failed to generate report');
    res.status(500).json({ error: (error as Error).message });
  }
});

export default caseRouter;
