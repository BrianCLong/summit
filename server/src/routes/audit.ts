import { Router } from 'express';
import archiver from 'archiver';
import { getPostgresPool } from '../db/postgres.js';
import { ProvenanceRepo } from '../repos/ProvenanceRepo.js';
import { ensureAuthenticated, requirePermission } from '../middleware/auth.js';
import { getAuditSystem, ComplianceFramework } from '../audit/advanced-audit-system.js';
import logger from '../utils/logger.js';

export const auditRouter = Router();

// --- Legacy Incident/Investigation Audit Routes ---

auditRouter.get('/incidents/:id/audit-bundle.zip', async (req, res) => {
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
  archive.on('error', (err) =>
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

auditRouter.get('/investigations/:id/audit-bundle.zip', async (req, res) => {
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
  archive.on('error', (err) =>
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
  async (req, res) => {
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
      } = req.query;

      const events = await getAuditSystem().queryEvents({
        startTime: startTime ? new Date(startTime as string) : undefined,
        endTime: endTime ? new Date(endTime as string) : undefined,
        eventTypes: eventTypes ? (eventTypes as string).split(',') as any[] : undefined,
        levels: levels ? (levels as string).split(',') as any[] : undefined,
        userIds: userIds ? (userIds as string).split(',') : undefined,
        resourceTypes: resourceTypes ? (resourceTypes as string).split(',') : undefined,
        correlationIds: correlationIds ? (correlationIds as string).split(',') : undefined,
        limit: limit ? parseInt(limit as string, 10) : 50,
        offset: offset ? parseInt(offset as string, 10) : 0,
        tenantIds: [req.user.tenantId || 'system'], // Scoped to tenant
      });

      res.json({ data: events });
    } catch (error) {
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
  async (req, res) => {
    try {
      const { framework, startTime, endTime } = req.query;

      if (!framework || !startTime || !endTime) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      const report = await getAuditSystem().generateComplianceReport(
        framework as ComplianceFramework,
        new Date(startTime as string),
        new Date(endTime as string),
      );

      res.json({ data: report });
    } catch (error) {
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
  async (req, res) => {
    try {
       const { startTime, endTime } = req.query;

       const result = await getAuditSystem().verifyIntegrity(
         startTime ? new Date(startTime as string) : undefined,
         endTime ? new Date(endTime as string) : undefined
       );

       res.json({ data: result });
    } catch (error) {
      logger.error('Failed to verify integrity', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

export default auditRouter;
