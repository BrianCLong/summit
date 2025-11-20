/**
 * Case Routes - REST API endpoints for Case Spaces
 * Implements CRUD operations with integrated audit logging
 */

import { Router } from 'express';
import { getPostgresPool } from '../db/postgres.js';
import { CaseService } from '../cases/CaseService.js';
import { CaseInput, CaseUpdateInput } from '../repos/CaseRepo.js';
import { LegalBasis } from '../repos/AuditAccessLogRepo.js';
import logger from '../config/logger.js';

const routeLogger = logger.child({ name: 'CaseRoutes' });

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

    routeLogger.info(
      { caseId: caseRecord.id, tenantId, userId },
      'Case created via API',
    );

    res.status(201).json(caseRecord);
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    routeLogger.error({ error: (error as Error).message }, 'Failed to export case');
    res.status(500).json({ error: (error as Error).message });
  }
});

export default caseRouter;
