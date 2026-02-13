// @ts-nocheck
import { Router, Response } from 'express';
import type { AuthenticatedRequest } from './types.js';
import archiver from 'archiver';
import { getPostgresPool } from '../db/postgres.js';
import { ProvenanceRepo } from '../repos/ProvenanceRepo.js';
import { ensureAuthenticated, requirePermission } from '../middleware/auth.js';
import { advancedAuditSystem } from '../audit/index.js';
import { ComplianceFramework } from '../audit/advanced-audit-system.js';
import logger from '../utils/logger.js';
import { BundleVerifier } from '../audit/BundleVerifier.js';
import rateLimit from 'express-rate-limit';

export const auditRouter = Router();

// Rate limiter for verification endpoint
const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many verification requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// --- Public-Facing Bundle Verifier ---
auditRouter.post('/verify-bundle', verificationLimiter, async (req: any, res: Response) => {
  if (process.env.AUDIT_VERIFY !== 'true') {
    return res.status(404).json({ error: 'Feature disabled' });
  }

  // Token scope check (simulated)
  const token = req.headers['x-verify-token'];
  if (!token) {
    return res.status(401).json({ error: 'Missing verification token' });
  }

  try {
    const report = await BundleVerifier.getInstance().verify(req.body);
    res.json(report);
  } catch (error: any) {
    logger.error('Bundle verification failed', error);
    res.status(500).json({ error: 'Verification process failed' });
  }
});

// --- Legacy Incident/Investigation Audit Routes ---

auditRouter.get('/incidents/:id/audit-bundle.zip', async (req: AuthenticatedRequest, res: Response) => {
  const tenant = String(
    (req.headers['x-tenant-id'] as any) ||
    (req.headers['x-tenant'] as any) ||
    '',
  );
  if (!tenant) return res.status(400).json({ error: 'tenant_required' });
  const { id } = req.params as { id: string };
  const pg = getPostgresPool();
  const prov = new ProvenanceRepo(pg);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="incident-${id}-audit.zip"`,
  );
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err: any) =>
    res.status(500).end(`Archive error: ${err.message}`),
  );
  archive.pipe(res);

  try {
    const { rows } = await pg.query('SELECT * FROM incidents WHERE id = $1', [
      id,
    ]);
    archive.append(
      JSON.stringify(
        { incident: rows[0] ?? null, generatedAt: new Date().toISOString() },
        null,
        2,
      ),
      { name: 'incident.json' },
    );
  } catch {
    archive.append(
      JSON.stringify(
        {
          warning: 'incidents table not available',
          generatedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      { name: 'incident.json' },
    );
  }

  try {
    const events = await prov.by('incident', id, undefined, 5000, 0);
    archive.append(JSON.stringify(events, null, 2), {
      name: 'provenance.json',
    });
  } catch {
    archive.append(
      JSON.stringify({ error: 'failed to load provenance' }, null, 2),
      {
        name: 'provenance.json',
      },
    );
  }

  await archive.finalize();
});

auditRouter.get('/investigations/:id/audit-bundle.zip', async (req: AuthenticatedRequest, res: Response) => {
  const tenant = String(
    (req.headers['x-tenant-id'] as any) ||
    (req.headers['x-tenant'] as any) ||
    '',
  );
  if (!tenant) return res.status(400).json({ error: 'tenant_required' });
  const { id } = req.params as { id: string };
  const pg = getPostgresPool();
  const prov = new ProvenanceRepo(pg);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="investigation-${id}-audit.zip"`,
  );
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err: any) =>
    res.status(500).end(`Archive error: ${err.message}`),
  );
  archive.pipe(res);

  try {
    const { rows } = await pg.query(
      'SELECT * FROM investigations WHERE id = $1',
      [id],
    );
    archive.append(
      JSON.stringify(
        {
          investigation: rows[0] ?? null,
          generatedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      { name: 'investigation.json' },
    );
  } catch {
    archive.append(
      JSON.stringify(
        {
          warning: 'investigations table not available',
          generatedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      { name: 'investigation.json' },
    );
  }

  try {
    const events = await prov.by('investigation', id, undefined, 5000, 0);
    archive.append(JSON.stringify(events, null, 2), {
      name: 'provenance.json',
    });
  } catch {
    archive.append(
      JSON.stringify({ error: 'failed to load provenance' }, null, 2),
      {
        name: 'provenance.json',
      },
    );
  }

  await archive.finalize();
});

// --- New Advanced Audit System Routes ---

// Query audit events
auditRouter.get(
  '/',
  ensureAuthenticated,
  requirePermission('audit:read'), // Admin or compliance officer only
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        startTime,
        endTime,
        eventTypes,
        levels,
        userIds,
        resourceTypes,
        correlationIds,
        limit,
        offset,
      } = req.query as any;

      const events = await advancedAuditSystem.queryEvents({
        startTime: startTime ? new Date(startTime as string) : undefined,
        endTime: endTime ? new Date(endTime as string) : undefined,
        eventTypes: eventTypes ? (eventTypes as string).split(',') as any[] : undefined,
        levels: levels ? (levels as string).split(',') as any[] : undefined,
        userIds: userIds ? (userIds as string).split(',') : undefined,
        resourceTypes: resourceTypes ? (resourceTypes as string).split(',') : undefined,
        correlationIds: correlationIds ? (correlationIds as string).split(',') : undefined,
        limit: limit ? parseInt(limit as string, 10) : 50,
        offset: offset ? parseInt(offset as string, 10) : 0,
        // Strictly enforce tenant isolation.
        // If req.user.tenantId is missing (e.g. system admin or error), we default to empty array or specific handling.
        // But for "Customer-grade compliance", we want to ensure they ONLY see their own data.
        // Assuming 'system' is only for internal use and shouldn't be the default fallback for a logged-in user without tenantId.
        tenantIds: req.user?.tenantId ? [req.user.tenantId] : [],
      });

      res.json({ data: events });
    } catch (error: any) {
      logger.error('Failed to query audit events', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
);

// Generate compliance report
auditRouter.get(
  '/compliance-report',
  ensureAuthenticated,
  requirePermission('audit:report'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { framework, startTime, endTime } = req.query as any;

      if (!framework || !startTime || !endTime) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      const report = await advancedAuditSystem.generateComplianceReport(
        framework as ComplianceFramework,
        new Date(startTime as string),
        new Date(endTime as string),
      );

      res.json({ data: report });
    } catch (error: any) {
      logger.error('Failed to generate compliance report', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
);

// Verify integrity
auditRouter.get(
  '/integrity',
  ensureAuthenticated,
  requirePermission('audit:verify'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { startTime, endTime } = req.query as any;

      const result = await advancedAuditSystem.verifyIntegrity(
        startTime ? new Date(startTime as string) : undefined,
        endTime ? new Date(endTime as string) : undefined
      );

      res.json({ data: result });
    } catch (error: any) {
      logger.error('Failed to verify integrity', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

export default auditRouter;
