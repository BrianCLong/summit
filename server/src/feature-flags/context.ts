import { Request } from 'express';
import { context as otContext, trace } from '@opentelemetry/api';
import { FeatureFlagContext } from './types.js';

export function buildContextFromRequest(req: Request): FeatureFlagContext {
  const activeContext = otContext.active();
  const spanContext = trace.getSpan(activeContext)?.spanContext();
  const user: any = (req as any).user || {};

  return {
    userId: user.sub || user.id,
    tenantId: user.tenant_id,
    roles: user.roles || (user.role ? [user.role] : []),
    scopes: user.scopes || [],
    source: 'http-request',
    module: (req as any).module || undefined,
    ip: req.ip,
    correlationId: (req as any).correlationId,
    requestId: (req as any).correlationId,
    traceId: (req as any).traceId || spanContext?.traceId,
    spanId: (req as any).spanId || spanContext?.spanId,
    environment: process.env.NODE_ENV || 'development',
    metadata: {
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
    },
  };
}
