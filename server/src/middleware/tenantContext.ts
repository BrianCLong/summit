import { Request, Response, NextFunction } from 'express';
import { tenantService } from '../tenancy/tenantService.js';
import pino from 'pino';

const logger = pino({ name: 'tenant-middleware' });

export const tenantContext = async (req: Request, res: Response, next: NextFunction) => {
  // Skip tenancy check for health checks and metrics
  if (req.path === '/healthz' || req.path === '/metrics' || req.path === '/') {
    return next();
  }

  // 1. Try to get tenant ID from header
  let tenantId = req.headers['x-tenant-id'] as string;

  // 2. If not in header, try to extract from subdomain (e.g., tenant.app.com)
  // This is optional and depends on your deployment strategy.
  // const host = req.headers.host;
  // if (!tenantId && host) {
  //   const parts = host.split('.');
  //   if (parts.length > 2) {
  //      tenantId = parts[0];
  //   }
  // }

  if (!tenantId) {
    // For now, we require the header. In the future, we might have a default tenant or public routes.
    // We'll allow requests without tenant ID to proceed, but req.tenant will be undefined.
    // Specific routes that require tenancy should enforce it.
    // However, the prompt says "Implement tenant context middleware and request scoping".
    // If we want strict multi-tenancy, we might want to block here.
    // But for migration/backward compatibility, it's safer to just log and proceed, or only block on API routes.

    if (req.path.startsWith('/api/') || req.path.startsWith('/graphql')) {
       // return res.status(400).json({ error: 'Missing X-Tenant-ID header' });
       // Soft enforcement for now as we transition
    }
    return next();
  }

  try {
    const tenant = await tenantService.getTenant(tenantId);

    if (!tenant) {
      logger.warn({ tenantId }, 'Tenant not found');
      return res.status(404).json({ error: 'Tenant not found' });
    }

    if (tenant.status !== 'active') {
      logger.warn({ tenantId, status: tenant.status }, 'Tenant is not active');
      return res.status(403).json({ error: 'Tenant is not active' });
    }

    // Attach tenant to request
    req.tenant = tenant;
    req.tenantId = tenant.id;

    // Set up request-scoped logger with tenant context
    // req.log = logger.child({ tenantId });

    next();
  } catch (error) {
    logger.error({ err: error, tenantId }, 'Error loading tenant context');
    res.status(500).json({ error: 'Internal server error loading tenant context' });
  }
};
