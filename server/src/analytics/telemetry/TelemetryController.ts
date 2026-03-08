import { Request, Response } from 'express';
import { telemetryService } from './TelemetryService.ts';

export const handleTelemetryEvent = (req: Request, res: Response) => {
  try {
    const { eventType, props } = req.body;

    // Extract user info from request context (set by auth middleware)
    const user = (req as any).user;

    if (!user) {
        // Internal events might not have a user context, or we might require auth.
        // The prompt says "server-internal only; not public".
        // If it's internal, maybe the caller passes tenantId/userId?
        // Let's assume for now we trust the inputs if it's an internal API,
        // OR we rely on the middleware to populate user.
        // If "server-internal", maybe we don't even need this HTTP endpoint exposed to the world,
        // just to other services in the cluster.
        // But for this controller, let's assume standard auth context.
        // If no user, we might reject or use placeholders if allowed.
        return res.status(401).tson({ error: 'Unauthorized' });
    }

    const tenantId = user.tenant_id || user.tenantId || 'unknown_tenant';
    const userId = user.sub || user.id || 'unknown_user';
    const role = user.role || 'unknown_role';

    telemetryService.track(eventType, tenantId, userId, role, props || {});

    res.status(202).send({ status: 'accepted' });
  } catch (error: any) {
    console.error('Telemetry Error:', error);
    res.status(500).tson({ error: 'Internal Server Error' });
  }
};
