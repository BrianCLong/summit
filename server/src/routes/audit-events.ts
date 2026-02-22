import { Router } from 'express';
import { advancedAuditSystem } from '../audit/index.js';
import logger from '../config/logger.js';

const routeLogger = logger.child({ name: 'AuditEventsRoutes' });

const router = Router();

function getTenantId(req: any): string | null {
  return String(
    req.headers['x-tenant-id'] || req.headers['x-tenant'] || '',
  ) || null;
}

function parseList(value?: string | string[]): string[] | undefined {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value.join(',') : value;
  const list = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length > 0 ? list : undefined;
}

router.get('/audit-events', async (req, res) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    const query = {
      startTime: (req.query.startTime as any)
        ? new Date(req.query.startTime as string)
        : undefined,
      endTime: (req.query.endTime as any)
        ? new Date(req.query.endTime as string)
        : undefined,
      eventTypes: parseList(req.query.eventTypes as string | undefined),
      levels: parseList(req.query.levels as string | undefined),
      userIds: parseList(req.query.userIds as string | undefined),
      resourceTypes: parseList(req.query.resourceTypes as string | undefined),
      correlationIds: parseList(req.query.correlationIds as string | undefined),
      tenantIds: [tenantId],
      limit: (req.query.limit as any) ? Number((req.query.limit as any)) : 100,
      offset: (req.query.offset as any) ? Number((req.query.offset as any)) : 0,
    };

    const events = await advancedAuditSystem.queryEvents(query);

    routeLogger.info(
      { tenantId, returnedCount: events.length },
      'Audit events retrieved',
    );

    res.json({
      tenantId,
      returnedCount: events.length,
      offset: query.offset,
      limit: query.limit,
      events,
    });
  } catch (error: any) {
    routeLogger.error(
      { error: (error as Error).message },
      'Failed to query audit events',
    );
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
